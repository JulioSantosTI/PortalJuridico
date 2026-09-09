import { Router } from "express";
import { z } from "zod";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { publicFileUrl } from "../../lib/s3";
import { asyncHandler, HttpError } from "../../middleware/error.middleware";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const internalTicketsRouter = Router();

export const attachmentInputSchema = z.object({
  storageKey: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

export const replySchema = z.object({
  message: z.string().min(1),
  attachments: z.array(attachmentInputSchema).optional(),
});

const createSchema = z.object({
  tipo: z.string().min(1),
  mensagem: z.string().min(1),
  attachments: z.array(attachmentInputSchema).optional(),
});

function withFileUrl<T extends { storageKey: string }>(attachment: T) {
  return { ...attachment, fileUrl: publicFileUrl(attachment.storageKey) };
}

const AUTHOR_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  setor: true,
  cargo: true,
  avatarKey: true,
} satisfies Prisma.UserSelect;

// Reaproveitados em admin.routes.ts — os dois lados (empresa e dono da
// plataforma) leem/serializam o mesmo chamado, só a auth que muda.
export const listInclude = {
  author: { select: AUTHOR_SELECT },
  _count: { select: { interactions: true, attachments: true } },
} satisfies Prisma.InternalTicketInclude;

export const detailInclude = {
  author: { select: AUTHOR_SELECT },
  attachments: { where: { interactionId: null } },
  interactions: {
    orderBy: { createdAt: "asc" },
    include: {
      authorUser: { select: { id: true, name: true, role: true, cargo: true, avatarKey: true } },
      authorAdmin: { select: { id: true, name: true } },
      attachments: true,
    },
  },
} satisfies Prisma.InternalTicketInclude;

type TicketWithList = Prisma.InternalTicketGetPayload<{ include: typeof listInclude }>;
type TicketWithDetail = Prisma.InternalTicketGetPayload<{ include: typeof detailInclude }>;

export function serializeTicketSummary(ticket: TicketWithList) {
  const { avatarKey, ...author } = ticket.author;
  return {
    id: ticket.id,
    tipo: ticket.tipo,
    mensagem: ticket.mensagem,
    status: ticket.status,
    createdAt: ticket.createdAt,
    resolvedAt: ticket.resolvedAt,
    author: { ...author, avatarUrl: avatarKey ? publicFileUrl(avatarKey) : null },
    _count: ticket._count,
  };
}

function serializeInteractionAuthor(interaction: TicketWithDetail["interactions"][number]) {
  if (interaction.authorUser) {
    const { avatarKey, ...rest } = interaction.authorUser;
    return { ...rest, avatarUrl: avatarKey ? publicFileUrl(avatarKey) : null };
  }
  // Sem cargo/setor/avatar — é o dono da plataforma, não um User da empresa.
  return { id: interaction.authorAdmin!.id, name: interaction.authorAdmin!.name, role: "ADMIN" as const, cargo: null, avatarUrl: null };
}

export function serializeTicketDetail(ticket: TicketWithDetail) {
  const { avatarKey, ...author } = ticket.author;
  return {
    id: ticket.id,
    tipo: ticket.tipo,
    mensagem: ticket.mensagem,
    status: ticket.status,
    createdAt: ticket.createdAt,
    resolvedAt: ticket.resolvedAt,
    author: { ...author, avatarUrl: avatarKey ? publicFileUrl(avatarKey) : null },
    attachments: ticket.attachments.map(withFileUrl),
    interactions: ticket.interactions.map((interaction) => ({
      id: interaction.id,
      message: interaction.message,
      createdAt: interaction.createdAt,
      author: serializeInteractionAuthor(interaction),
      attachments: interaction.attachments.map(withFileUrl),
    })),
  };
}

// Chamado interno: colaborador/gestor da empresa pedindo algo ao dono da
// plataforma (melhoria, bug, inativar usuário, revogar/atribuir licença...).
// Autor vem só de req.user!.id — nunca do corpo da requisição.
internalTicketsRouter.post(
  "/",
  requireAuth,
  requireRole(Role.COLABORADOR, Role.GESTOR),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const ticket = await prisma.internalTicket.create({
      data: {
        authorId: req.user!.id,
        tipo: body.tipo,
        mensagem: body.mensagem,
        attachments: body.attachments
          ? {
              create: body.attachments.map((a) => ({
                fileName: a.fileName,
                storageKey: a.storageKey,
                mimeType: a.mimeType,
                sizeBytes: a.sizeBytes,
              })),
            }
          : undefined,
      },
      include: detailInclude,
    });
    res.status(201).json({ ticket: serializeTicketDetail(ticket) });
  })
);

internalTicketsRouter.get(
  "/mine",
  requireAuth,
  requireRole(Role.COLABORADOR, Role.GESTOR),
  asyncHandler(async (req, res) => {
    const tickets = await prisma.internalTicket.findMany({
      where: { authorId: req.user!.id },
      include: listInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json({ tickets: tickets.map(serializeTicketSummary) });
  })
);

internalTicketsRouter.get(
  "/:id",
  requireAuth,
  requireRole(Role.COLABORADOR, Role.GESTOR),
  asyncHandler(async (req, res) => {
    const ticket = await prisma.internalTicket.findUnique({ where: { id: req.params.id }, include: detailInclude });
    if (!ticket) throw new HttpError(404, "Chamado não encontrado");
    if (ticket.authorId !== req.user!.id) throw new HttpError(403, "Acesso não permitido a este chamado");
    res.json({ ticket: serializeTicketDetail(ticket) });
  })
);

internalTicketsRouter.post(
  "/:id/interactions",
  requireAuth,
  requireRole(Role.COLABORADOR, Role.GESTOR),
  asyncHandler(async (req, res) => {
    const body = replySchema.parse(req.body);

    const existing = await prisma.internalTicket.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Chamado não encontrado");
    if (existing.authorId !== req.user!.id) throw new HttpError(403, "Acesso não permitido a este chamado");

    await prisma.internalTicketInteraction.create({
      data: {
        ticketId: existing.id,
        authorUserId: req.user!.id,
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

    const updated = await prisma.internalTicket.findUniqueOrThrow({ where: { id: existing.id }, include: detailInclude });
    res.status(201).json({ ticket: serializeTicketDetail(updated) });
  })
);
