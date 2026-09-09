import { Router } from "express";
import { z } from "zod";
import { Role, RequestStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { addBusinessDays } from "../../lib/businessDays";
import { asyncHandler, HttpError } from "../../middleware/error.middleware";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { serializeWithCountdown } from "./requests.service";
import { sendEmail } from "../../lib/email";

export const requestsRouter = Router();

const attachmentInputSchema = z.object({
  storageKey: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

const createRequestSchema = z.object({
  requestTypeSlug: z.string().min(1),
  requesterSetor: z.string().min(1),
  requesterLoja: z.string().min(1),
  advertidoNome: z.string().min(1).optional(),
  motivo: z.string().min(1).optional(),
  descricaoRevisao: z.string().min(1).optional(),
  detalhes: z.record(z.any()).optional(),
  attachments: z.array(attachmentInputSchema).optional(),
});

const listQuerySchema = z.object({
  status: z.nativeEnum(RequestStatus).optional(),
  requestTypeId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
});

const historyQuerySchema = z.object({
  solicitante: z.string().optional(),
  setor: z.string().optional(),
  loja: z.string().optional(),
  advertido: z.string().optional(),
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
});

const assignSchema = z.object({
  assignedToId: z.string().uuid(),
});

const listInclude = {
  requestType: true,
  requester: { select: { id: true, name: true, setor: true, loja: true } },
  assignedTo: { select: { id: true, name: true } },
  _count: { select: { attachments: true, interactions: true } },
} as const;

const detailInclude = {
  requestType: true,
  requester: { select: { id: true, name: true, setor: true, loja: true } },
  assignedTo: { select: { id: true, name: true } },
  attachments: true,
  interactions: {
    orderBy: { createdAt: "asc" as const },
    include: {
      author: { select: { id: true, name: true, cargo: true, avatarKey: true } },
      attachments: true,
    },
  },
};

requestsRouter.post(
  "/",
  requireAuth,
  requireRole(Role.USUARIO),
  asyncHandler(async (req, res) => {
    const body = createRequestSchema.parse(req.body);

    const requestType = await prisma.requestType.findUnique({ where: { slug: body.requestTypeSlug } });
    if (!requestType || !requestType.active) throw new HttpError(400, "Tipo de solicitação inválido");

    if (requestType.slug === "advertencia" && (!body.advertidoNome || !body.motivo)) {
      throw new HttpError(400, "Advertência exige 'advertidoNome' e 'motivo'");
    }
    if (requestType.slug === "revisao_contrato" && !body.descricaoRevisao) {
      throw new HttpError(400, "Revisão de contrato exige 'descricaoRevisao'");
    }
    if (requestType.slug !== "advertencia" && requestType.slug !== "revisao_contrato") {
      const descricao = typeof body.detalhes?.descricao === "string" ? body.detalhes.descricao.trim() : "";
      if (!descricao) throw new HttpError(400, "Descrição é obrigatória para esse tipo de solicitação");
    }

    const now = new Date();
    const dueDate = addBusinessDays(now, requestType.slaBusinessDays);

    const created = await prisma.request.create({
      data: {
        requestTypeId: requestType.id,
        requesterId: req.user!.id,
        requesterSetor: body.requesterSetor,
        requesterLoja: body.requesterLoja,
        advertidoNome: body.advertidoNome,
        motivo: body.motivo,
        descricaoRevisao: body.descricaoRevisao,
        detalhes: body.detalhes,
        dueDate,
        attachments: body.attachments
          ? {
              create: body.attachments.map((a) => ({
                fileName: a.fileName,
                storageKey: a.storageKey,
                mimeType: a.mimeType,
                sizeBytes: a.sizeBytes,
                uploadedById: req.user!.id,
              })),
            }
          : undefined,
      },
      include: detailInclude,
    });

    // Best-effort, não bloqueia a resposta: avisa todo GESTOR ativo que uma
    // nova solicitação foi aberta. Corpo é só um placeholder por enquanto.
    prisma.user
      .findMany({ where: { role: Role.GESTOR, active: true, hasLicense: true }, select: { email: true } })
      .then((gestores) => {
        const to = gestores.map((g) => g.email);
        sendEmail(
          to,
          `Nova solicitação aberta — ${created.requestType.name}`,
          `Uma nova solicitação de ${created.requestType.name} foi aberta por ${created.requester.name}.\n\n` +
            `Acesse: ${process.env.FRONTEND_URL}/solicitacoes/${created.id}`
        );
      })
      .catch((err) => console.error("Falha ao buscar gestores para notificar:", err));

    res.status(201).json({ request: serializeWithCountdown(created) });
  })
);

requestsRouter.get(
  "/mine",
  requireAuth,
  requireRole(Role.USUARIO),
  asyncHandler(async (req, res) => {
    const items = await prisma.request.findMany({
      where: { requesterId: req.user!.id },
      include: listInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json({ requests: items.map(serializeWithCountdown) });
  })
);

requestsRouter.get(
  "/history",
  requireAuth,
  requireRole(Role.COLABORADOR, Role.GESTOR),
  asyncHandler(async (req, res) => {
    const q = historyQuerySchema.parse(req.query);

    const items = await prisma.request.findMany({
      where: {
        status: RequestStatus.FINALIZADO,
        requesterSetor: q.setor ? { contains: q.setor, mode: "insensitive" } : undefined,
        requesterLoja: q.loja ? { contains: q.loja, mode: "insensitive" } : undefined,
        advertidoNome: q.advertido ? { contains: q.advertido, mode: "insensitive" } : undefined,
        requester: q.solicitante ? { name: { contains: q.solicitante, mode: "insensitive" } } : undefined,
        createdAt:
          q.dataInicio || q.dataFim
            ? { gte: q.dataInicio ? new Date(q.dataInicio) : undefined, lte: q.dataFim ? new Date(q.dataFim) : undefined }
            : undefined,
      },
      include: listInclude,
      orderBy: { closedAt: "desc" },
    });

    res.json({ requests: items.map(serializeWithCountdown) });
  })
);

requestsRouter.get(
  "/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const item = await prisma.request.findUnique({ where: { id: req.params.id }, include: detailInclude });
    if (!item) throw new HttpError(404, "Solicitação não encontrada");

    if (req.user!.role === Role.USUARIO && item.requesterId !== req.user!.id) {
      throw new HttpError(403, "Acesso não permitido a esta solicitação");
    }

    res.json({ request: serializeWithCountdown(item) });
  })
);

requestsRouter.get(
  "/",
  requireAuth,
  requireRole(Role.COLABORADOR, Role.GESTOR),
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.parse(req.query);
    const items = await prisma.request.findMany({
      where: {
        status: q.status,
        requestTypeId: q.requestTypeId,
        assignedToId: q.assignedToId,
      },
      include: listInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json({ requests: items.map(serializeWithCountdown) });
  })
);

requestsRouter.patch(
  "/:id/assign",
  requireAuth,
  requireRole(Role.COLABORADOR, Role.GESTOR),
  asyncHandler(async (req, res) => {
    const { assignedToId } = assignSchema.parse(req.body);

    if (req.user!.role === Role.COLABORADOR && assignedToId !== req.user!.id) {
      throw new HttpError(403, "Colaborador só pode se auto-atribuir");
    }

    const target = await prisma.user.findUnique({ where: { id: assignedToId } });
    if (!target || (target.role !== Role.COLABORADOR && target.role !== Role.GESTOR)) {
      throw new HttpError(400, "Usuário de destino inválido para atribuição");
    }

    const existing = await prisma.request.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Solicitação não encontrada");

    const updated = await prisma.request.update({
      where: { id: req.params.id },
      data: { assignedToId },
      include: detailInclude,
    });

    // Best-effort: avisa quem recebeu a atribuição (pula quando é auto-atribuição,
    // não faz sentido notificar a própria pessoa). Corpo é só um placeholder por enquanto.
    if (assignedToId !== req.user!.id) {
      sendEmail(
        target.email,
        `Chamado nº ${updated.id.slice(0, 8)} atribuído a você — ${updated.requestType.name}`,
        `O chamado nº ${updated.id.slice(0, 8)} (${updated.requestType.name}) foi atribuído a você.\n\n` +
          `Acesse: ${process.env.FRONTEND_URL}/solicitacoes/${updated.id}`
      );
    }

    res.json({ request: serializeWithCountdown(updated) });
  })
);
