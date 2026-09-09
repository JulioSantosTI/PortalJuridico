import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { signAdminToken } from "../../lib/adminJwt";
import { buildStorageKey, createPresignedUploadUrl, publicFileUrl } from "../../lib/s3";
import { asyncHandler, HttpError } from "../../middleware/error.middleware";
import { requireAdminAuth } from "../../middleware/adminAuth.middleware";
import {
  detailInclude as ticketDetailInclude,
  listInclude as ticketListInclude,
  replySchema as ticketReplySchema,
  serializeTicketDetail,
  serializeTicketSummary,
} from "../internalTickets/internalTickets.routes";

export const adminRouter = Router();

const LICENSE_ROLES = [Role.USUARIO, Role.COLABORADOR] as const;

function publicAdmin(admin: { id: string; name: string; email: string }) {
  return { id: admin.id, name: admin.name, email: admin.email };
}

// ---------- Auth ----------

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

adminRouter.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const admin = await prisma.platformAdmin.findUnique({ where: { email } });
    if (!admin) throw new HttpError(401, "Credenciais inválidas");

    const passwordOk = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordOk) throw new HttpError(401, "Credenciais inválidas");

    const token = signAdminToken({ sub: admin.id });
    res.json({ token, admin: publicAdmin(admin) });
  })
);

adminRouter.get(
  "/auth/me",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const admin = await prisma.platformAdmin.findUniqueOrThrow({ where: { id: req.admin!.id } });
    res.json({ admin: publicAdmin(admin) });
  })
);

// ---------- Pools de licença ----------

adminRouter.get(
  "/license-pools",
  requireAdminAuth,
  asyncHandler(async (_req, res) => {
    const pools = await Promise.all(
      LICENSE_ROLES.map(async (role) => {
        const pool = await prisma.licensePool.findUnique({ where: { role } });
        const usedLicenses = await prisma.user.count({ where: { role, hasLicense: true } });
        const totalLicenses = pool?.totalLicenses ?? 0;
        return { role, totalLicenses, usedLicenses, available: Math.max(totalLicenses - usedLicenses, 0) };
      })
    );
    res.json({ licensePools: pools });
  })
);

const updatePoolSchema = z.object({
  totalLicenses: z.number().int().min(0),
});

adminRouter.patch(
  "/license-pools/:role",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const role = z.nativeEnum(Role).parse(req.params.role);
    if (!(LICENSE_ROLES as readonly Role[]).includes(role)) {
      throw new HttpError(400, "Papel inválido para controle de licenças");
    }
    const { totalLicenses } = updatePoolSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      // Trava o pool do papel: impede que uma redução concorra com uma
      // aprovação de acesso lendo um "usedLicenses" desatualizado.
      await tx.$executeRaw`SELECT id FROM "LicensePool" WHERE role = ${role}::"Role" FOR UPDATE`;

      const usedLicenses = await tx.user.count({ where: { role, hasLicense: true } });
      if (totalLicenses < usedLicenses) {
        throw new HttpError(
          400,
          `Não é possível reduzir para ${totalLicenses}: há ${usedLicenses} licença(s) ativa(s) para esse papel.`
        );
      }

      const pool = await tx.licensePool.upsert({
        where: { role },
        update: { totalLicenses },
        create: { role, totalLicenses },
      });

      return { pool, usedLicenses };
    });

    res.json({
      licensePool: {
        role: result.pool.role,
        totalLicenses: result.pool.totalLicenses,
        usedLicenses: result.usedLicenses,
        available: Math.max(result.pool.totalLicenses - result.usedLicenses, 0),
      },
    });
  })
);

// ---------- Usuários ----------

function serializeAdminUser(user: {
  id: string;
  name: string;
  email: string;
  role: Role;
  setor: string;
  loja: string;
  active: boolean;
  hasLicense: boolean;
  createdAt?: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    setor: user.setor,
    loja: user.loja,
    active: user.active,
    hasLicense: user.hasLicense,
    createdAt: user.createdAt,
  };
}

const listUsersQuerySchema = z.object({
  status: z.enum(["COM_LICENCA", "CADASTRADOS", "INATIVO"]).default("CADASTRADOS"),
});

adminRouter.get(
  "/users",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const { status } = listUsersQuerySchema.parse(req.query);
    const roleFilter = { in: LICENSE_ROLES as unknown as Role[] };
    const where =
      status === "INATIVO"
        ? { active: false, role: roleFilter }
        : status === "COM_LICENCA"
        ? { active: true, hasLicense: true, role: roleFilter }
        : { active: true, role: roleFilter }; // CADASTRADOS: ativos, com ou sem licença

    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, setor: true, loja: true, active: true, hasLicense: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json({ users: users.map(serializeAdminUser) });
  })
);

adminRouter.patch(
  "/users/:id/revoke",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Usuário não encontrado");
    if (!existing.hasLicense) throw new HttpError(400, "Usuário não tem uma licença atribuída");

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { hasLicense: false },
    });

    res.json({ user: serializeAdminUser(updated) });
  })
);

adminRouter.patch(
  "/users/:id/assign-license",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new HttpError(404, "Usuário não encontrado");
      if (!(LICENSE_ROLES as readonly Role[]).includes(existing.role)) {
        throw new HttpError(400, "Papel inválido para controle de licenças");
      }
      if (!existing.active) throw new HttpError(400, "Não é possível atribuir licença a uma conta inativa");
      if (existing.hasLicense) throw new HttpError(400, "Usuário já tem uma licença atribuída");

      // Mesmo lock já usado em /license-pools/:role e em access-requests/:id/approve.
      await tx.$executeRaw`SELECT id FROM "LicensePool" WHERE role = ${existing.role}::"Role" FOR UPDATE`;
      const pool = await tx.licensePool.findUnique({ where: { role: existing.role } });
      const usedLicenses = await tx.user.count({ where: { role: existing.role, hasLicense: true } });
      if (usedLicenses >= (pool?.totalLicenses ?? 0)) {
        throw new HttpError(400, "Não há licenças disponíveis para esse papel");
      }

      return tx.user.update({ where: { id: existing.id }, data: { hasLicense: true } });
    });

    res.json({ user: serializeAdminUser(result) });
  })
);

adminRouter.patch(
  "/users/:id/deactivate",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Usuário não encontrado");
    if (!(LICENSE_ROLES as readonly Role[]).includes(existing.role)) {
      throw new HttpError(400, "Papel inválido");
    }
    if (!existing.active) throw new HttpError(400, "Usuário já está inativo");

    // Desativar sempre libera a licença junto — não existe inativo com licença presa.
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { active: false, hasLicense: false },
    });

    res.json({ user: serializeAdminUser(updated) });
  })
);

adminRouter.patch(
  "/users/:id/reactivate",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Usuário não encontrado");
    if (!(LICENSE_ROLES as readonly Role[]).includes(existing.role)) {
      throw new HttpError(400, "Papel inválido");
    }
    if (existing.active) throw new HttpError(400, "Usuário já está ativo");

    // Reativa sem licença de propósito — quem quiser atribuir, faz depois, explicitamente.
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { active: true },
    });

    res.json({ user: serializeAdminUser(updated) });
  })
);

// ---------- Chamados internos ----------

const ticketStatusSchema = z.object({
  status: z.enum(["ABERTO", "RESOLVIDO"]).default("ABERTO"),
});

adminRouter.get(
  "/internal-tickets",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const { status } = ticketStatusSchema.parse(req.query);
    const tickets = await prisma.internalTicket.findMany({
      where: { status },
      include: ticketListInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json({ tickets: tickets.map(serializeTicketSummary) });
  })
);

adminRouter.get(
  "/internal-tickets/:id",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const ticket = await prisma.internalTicket.findUnique({ where: { id: req.params.id }, include: ticketDetailInclude });
    if (!ticket) throw new HttpError(404, "Chamado não encontrado");
    res.json({ ticket: serializeTicketDetail(ticket) });
  })
);

adminRouter.post(
  "/internal-tickets/:id/interactions",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const body = ticketReplySchema.parse(req.body);

    const existing = await prisma.internalTicket.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Chamado não encontrado");

    await prisma.internalTicketInteraction.create({
      data: {
        ticketId: existing.id,
        authorAdminId: req.admin!.id,
        message: body.message,
        attachments: body.attachments
          ? {
              create: body.attachments.map((a) => ({
                ticketId: existing.id,
                fileName: a.fileName,
                storageKey: a.storageKey,
                mimeType: a.mimeType,
                sizeBytes: a.sizeBytes,
              })),
            }
          : undefined,
      },
    });

    const updated = await prisma.internalTicket.findUniqueOrThrow({ where: { id: existing.id }, include: ticketDetailInclude });
    res.status(201).json({ ticket: serializeTicketDetail(updated) });
  })
);

adminRouter.patch(
  "/internal-tickets/:id/resolve",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const existing = await prisma.internalTicket.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Chamado não encontrado");
    if (existing.status === "RESOLVIDO") throw new HttpError(400, "Chamado já está resolvido");

    await prisma.internalTicket.update({
      where: { id: existing.id },
      data: { status: "RESOLVIDO", resolvedAt: new Date() },
    });

    const updated = await prisma.internalTicket.findUniqueOrThrow({ where: { id: existing.id }, include: ticketDetailInclude });
    res.json({ ticket: serializeTicketDetail(updated) });
  })
);

// ---------- Upload (anexos de chamados internos) ----------

const presignSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
});

// Endpoint próprio de admin, separado do /api/uploads de empresa — mesma
// lógica de sempre: o dono da plataforma tem sua própria fronteira de auth,
// nunca reaproveita o presign de usuário/colaborador/gestor.
adminRouter.post(
  "/uploads/presign",
  requireAdminAuth,
  asyncHandler(async (req, res) => {
    const { fileName, mimeType } = presignSchema.parse(req.body);
    const storageKey = buildStorageKey(fileName);
    const uploadUrl = await createPresignedUploadUrl(storageKey, mimeType);
    res.json({ uploadUrl, storageKey, fileUrl: publicFileUrl(storageKey) });
  })
);
