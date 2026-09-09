import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AccessRequestStatus, Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler, HttpError } from "../../middleware/error.middleware";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const accessRequestsRouter = Router();

const REQUESTABLE_ROLES = [Role.USUARIO, Role.COLABORADOR] as const;

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  setor: z.string().min(1),
  loja: z.string().min(1),
  cidade: z.string().min(1),
  estado: z.enum(UFS),
  requestedRole: z.enum(["USUARIO", "COLABORADOR"]),
});

function serializeRequest(r: {
  id: string;
  name: string;
  email: string;
  setor: string;
  loja: string;
  cidade: string;
  estado: string;
  requestedRole: Role;
  status: AccessRequestStatus;
  rejectionReason: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    setor: r.setor,
    loja: r.loja,
    cidade: r.cidade,
    estado: r.estado,
    requestedRole: r.requestedRole,
    status: r.status,
    rejectionReason: r.rejectionReason,
    reviewedAt: r.reviewedAt,
    createdAt: r.createdAt,
  };
}

// Pública: quem está pedindo acesso ainda não tem conta.
accessRequestsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email: body.email } });
    if (existingUser) throw new HttpError(400, "Já existe uma conta com esse e-mail");

    const pendingRequest = await prisma.accessRequest.findFirst({
      where: { email: body.email, status: AccessRequestStatus.PENDENTE },
    });
    if (pendingRequest) throw new HttpError(400, "Já existe uma solicitação pendente para esse e-mail");

    const passwordHash = await bcrypt.hash(body.password, 10);

    const created = await prisma.accessRequest.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash,
        setor: body.setor,
        loja: body.loja,
        cidade: body.cidade,
        estado: body.estado,
        requestedRole: body.requestedRole,
      },
    });

    res.status(201).json({ request: serializeRequest(created) });
  })
);

const listQuerySchema = z.object({
  status: z.nativeEnum(AccessRequestStatus).optional(),
});

accessRequestsRouter.get(
  "/",
  requireAuth,
  requireRole(Role.GESTOR),
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.parse(req.query);
    const requests = await prisma.accessRequest.findMany({
      where: { status: q.status ?? AccessRequestStatus.PENDENTE },
      orderBy: { createdAt: "desc" },
    });
    res.json({ requests: requests.map(serializeRequest) });
  })
);

accessRequestsRouter.patch(
  "/:id/approve",
  requireAuth,
  requireRole(Role.GESTOR),
  asyncHandler(async (req, res) => {
    const updated = await prisma.$transaction(async (tx) => {
      // Trava a própria solicitação: impede que dois cliques/abas aprovem a mesma
      // solicitação ao mesmo tempo (evita criar dois usuários pro mesmo e-mail).
      await tx.$executeRaw`SELECT id FROM "AccessRequest" WHERE id = ${req.params.id} FOR UPDATE`;

      const existing = await tx.accessRequest.findUnique({ where: { id: req.params.id } });
      if (!existing) throw new HttpError(404, "Solicitação não encontrada");
      if (existing.status !== AccessRequestStatus.PENDENTE) {
        throw new HttpError(400, "Essa solicitação já foi analisada");
      }

      // Trava o pool de licenças do papel: serializa aprovações concorrentes do
      // mesmo papel, pra duas aprovações simultâneas não passarem pela checagem
      // de disponibilidade ao mesmo tempo e estourar o limite contratado.
      await tx.$executeRaw`SELECT id FROM "LicensePool" WHERE role = ${existing.requestedRole}::"Role" FOR UPDATE`;

      const pool = await tx.licensePool.findUnique({ where: { role: existing.requestedRole } });
      const totalLicenses = pool?.totalLicenses ?? 0;
      const usedLicenses = await tx.user.count({ where: { role: existing.requestedRole, hasLicense: true } });
      if (usedLicenses >= totalLicenses) {
        throw new HttpError(400, "Não há licenças disponíveis para esse papel");
      }

      const alreadyUser = await tx.user.findUnique({ where: { email: existing.email } });
      if (alreadyUser) throw new HttpError(400, "Já existe uma conta com esse e-mail");

      await tx.user.create({
        data: {
          name: existing.name,
          email: existing.email,
          passwordHash: existing.passwordHash,
          role: existing.requestedRole,
          setor: existing.setor,
          loja: existing.loja,
          cidade: existing.cidade,
          estado: existing.estado,
          hasLicense: true,
        },
      });

      return tx.accessRequest.update({
        where: { id: existing.id },
        data: { status: AccessRequestStatus.APROVADO, reviewedById: req.user!.id, reviewedAt: new Date() },
      });
    });

    // TODO: notificar por e-mail a pessoa aprovada (feature futura).
    res.json({ request: serializeRequest(updated) });
  })
);

const rejectSchema = z.object({
  reason: z.string().optional(),
});

accessRequestsRouter.patch(
  "/:id/reject",
  requireAuth,
  requireRole(Role.GESTOR),
  asyncHandler(async (req, res) => {
    const body = rejectSchema.parse(req.body);

    const existing = await prisma.accessRequest.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Solicitação não encontrada");
    if (existing.status !== AccessRequestStatus.PENDENTE) {
      throw new HttpError(400, "Essa solicitação já foi analisada");
    }

    const updated = await prisma.accessRequest.update({
      where: { id: existing.id },
      data: {
        status: AccessRequestStatus.RECUSADO,
        rejectionReason: body.reason,
        reviewedById: req.user!.id,
        reviewedAt: new Date(),
      },
    });

    // TODO: notificar por e-mail a pessoa recusada (feature futura).
    res.json({ request: serializeRequest(updated) });
  })
);

accessRequestsRouter.get(
  "/license-pools",
  requireAuth,
  requireRole(Role.GESTOR),
  asyncHandler(async (_req, res) => {
    const pools = await Promise.all(
      REQUESTABLE_ROLES.map(async (role) => {
        const pool = await prisma.licensePool.findUnique({ where: { role } });
        const usedLicenses = await prisma.user.count({ where: { role, hasLicense: true } });
        const totalLicenses = pool?.totalLicenses ?? 0;
        return { role, totalLicenses, usedLicenses, available: Math.max(totalLicenses - usedLicenses, 0) };
      })
    );
    res.json({ licensePools: pools });
  })
);
