import { Router } from "express";
import { z } from "zod";
import { Role, RequestStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler, HttpError } from "../../middleware/error.middleware";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { serializeWithCountdown } from "../requests/requests.service";

export const interactionsRouter = Router({ mergeParams: true });

const attachmentInputSchema = z.object({
  storageKey: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

const createInteractionSchema = z.object({
  message: z.string().min(1),
  statusChangeTo: z.nativeEnum(RequestStatus).optional(),
  attachments: z.array(attachmentInputSchema).optional(),
});

interactionsRouter.post(
  "/:id/interactions",
  requireAuth,
  requireRole(Role.COLABORADOR, Role.GESTOR),
  asyncHandler(async (req, res) => {
    const body = createInteractionSchema.parse(req.body);

    const request = await prisma.request.findUnique({ where: { id: req.params.id } });
    if (!request) throw new HttpError(404, "Solicitação não encontrada");

    if (req.user!.role === Role.COLABORADOR && request.assignedToId !== req.user!.id) {
      throw new HttpError(403, "Somente o colaborador responsável pode tratar esta solicitação");
    }

    await prisma.requestInteraction.create({
      data: {
        requestId: request.id,
        authorId: req.user!.id,
        message: body.message,
        statusChangeTo: body.statusChangeTo,
        attachments: body.attachments
          ? {
              create: body.attachments.map((a) => ({
                fileName: a.fileName,
                storageKey: a.storageKey,
                mimeType: a.mimeType,
                sizeBytes: a.sizeBytes,
                uploadedById: req.user!.id,
                requestId: request.id,
              })),
            }
          : undefined,
      },
    });

    const updated = await prisma.request.update({
      where: { id: request.id },
      data: {
        status: body.statusChangeTo ?? undefined,
        closedAt: body.statusChangeTo === RequestStatus.FINALIZADO ? new Date() : undefined,
      },
      include: {
        requestType: true,
        requester: { select: { id: true, name: true, setor: true, loja: true } },
        assignedTo: { select: { id: true, name: true } },
        attachments: true,
        interactions: {
          orderBy: { createdAt: "asc" },
          include: { author: { select: { id: true, name: true, cargo: true, avatarKey: true } }, attachments: true },
        },
      },
    });

    res.status(201).json({ request: serializeWithCountdown(updated) });
  })
);
