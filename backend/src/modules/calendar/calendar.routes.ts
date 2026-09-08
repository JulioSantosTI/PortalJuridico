import { Router } from "express";
import { z } from "zod";
import { Role, CalendarEvent } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { verifyToken } from "../../lib/jwt";
import { asyncHandler, HttpError } from "../../middleware/error.middleware";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";
import { buildAuthUrl, exchangeCodeAndSaveAccount } from "../../lib/googleCalendar";

export const calendarRouter = Router();

const FRONTEND_URL = process.env.FRONTEND_URL as string;

// Agenda própria da plataforma (eventos salvos no nosso banco, ver model `CalendarEvent`).
// A integração com o Google Calendar (lib/googleCalendar.ts) fica pronta e intacta logo
// abaixo (status/oauth/disconnect) para quando essa feature voltar a ser prioridade —
// as rotas de evento não dependem mais dela.
function serializeEvent(event: CalendarEvent) {
  return {
    id: event.id,
    summary: event.title,
    description: event.description,
    start: event.startAt.toISOString(),
    end: event.endAt.toISOString(),
    reminderMinutes: event.reminderMinutes,
    htmlLink: null,
  };
}

calendarRouter.get(
  "/status",
  requireAuth,
  requireRole(Role.COLABORADOR, Role.GESTOR),
  asyncHandler(async (req, res) => {
    const account = await prisma.googleAccount.findUnique({ where: { userId: req.user!.id } });
    res.json({ connected: Boolean(account), googleEmail: account?.googleEmail ?? null });
  })
);

calendarRouter.get(
  "/oauth/url",
  requireAuth,
  requireRole(Role.COLABORADOR, Role.GESTOR),
  asyncHandler(async (req, res) => {
    const rawToken = req.headers.authorization!.slice("Bearer ".length);
    res.json({ url: buildAuthUrl(rawToken) });
  })
);

// Rota pública: é o navegador do usuário sendo redirecionado de volta pelo Google,
// não uma chamada autenticada com header Authorization. A identidade vem do `state`.
calendarRouter.get(
  "/oauth/callback",
  asyncHandler(async (req, res) => {
    const { code, state, error } = req.query as { code?: string; state?: string; error?: string };

    if (error || !code || !state) {
      return res.redirect(`${FRONTEND_URL}/agenda?error=1`);
    }

    try {
      const payload = verifyToken(state);
      await exchangeCodeAndSaveAccount(payload.sub, code);
      return res.redirect(`${FRONTEND_URL}/agenda?connected=1`);
    } catch (err) {
      console.error("Falha ao concluir OAuth do Google:", err);
      return res.redirect(`${FRONTEND_URL}/agenda?error=1`);
    }
  })
);

calendarRouter.delete(
  "/disconnect",
  requireAuth,
  requireRole(Role.COLABORADOR, Role.GESTOR),
  asyncHandler(async (req, res) => {
    await prisma.googleAccount.deleteMany({ where: { userId: req.user!.id } });
    res.status(204).send();
  })
);

const listQuerySchema = z.object({
  colaboradorId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

calendarRouter.get(
  "/events",
  requireAuth,
  requireRole(Role.COLABORADOR, Role.GESTOR),
  asyncHandler(async (req, res) => {
    const q = listQuerySchema.parse(req.query);

    let targetUserId = req.user!.id;
    if (q.colaboradorId && q.colaboradorId !== req.user!.id) {
      if (req.user!.role !== Role.GESTOR) {
        throw new HttpError(403, "Somente o gestor pode ver a agenda de outro colaborador");
      }
      targetUserId = q.colaboradorId;
    }

    // Padrão: início do dia de hoje (não a hora exata "agora") — senão um compromisso
    // some da lista assim que o horário dele passa, mesmo que ainda seja hoje.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const from = q.from ? new Date(q.from) : startOfToday;
    const to = q.to ? new Date(q.to) : new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);

    const events = await prisma.calendarEvent.findMany({
      where: { userId: targetUserId, startAt: { gte: from, lte: to } },
      orderBy: { startAt: "asc" },
    });

    res.json({ events: events.map(serializeEvent) });
  })
);

const createEventSchema = z.object({
  summary: z.string().min(1),
  description: z.string().optional(),
  startDateTime: z.string().datetime(),
  endDateTime: z.string().datetime(),
  reminderMinutes: z.number().int().min(0).max(40320).optional(),
});

calendarRouter.post(
  "/events",
  requireAuth,
  requireRole(Role.COLABORADOR, Role.GESTOR),
  asyncHandler(async (req, res) => {
    const body = createEventSchema.parse(req.body);

    if (new Date(body.endDateTime).getTime() <= new Date(body.startDateTime).getTime()) {
      throw new HttpError(400, "O fim do compromisso deve ser depois do início");
    }

    const event = await prisma.calendarEvent.create({
      data: {
        userId: req.user!.id,
        title: body.summary,
        description: body.description,
        startAt: new Date(body.startDateTime),
        endAt: new Date(body.endDateTime),
        reminderMinutes: body.reminderMinutes ?? 30,
      },
    });

    res.status(201).json({ event: serializeEvent(event) });
  })
);

const updateEventSchema = z.object({
  summary: z.string().min(1).optional(),
  description: z.string().optional(),
  startDateTime: z.string().datetime().optional(),
  endDateTime: z.string().datetime().optional(),
  reminderMinutes: z.number().int().min(0).max(40320).optional(),
});

calendarRouter.patch(
  "/events/:eventId",
  requireAuth,
  requireRole(Role.COLABORADOR, Role.GESTOR),
  asyncHandler(async (req, res) => {
    const body = updateEventSchema.parse(req.body);

    const existing = await prisma.calendarEvent.findFirst({
      where: { id: req.params.eventId, userId: req.user!.id },
    });
    if (!existing) throw new HttpError(404, "Compromisso não encontrado");

    const startAt = body.startDateTime ? new Date(body.startDateTime) : existing.startAt;
    const endAt = body.endDateTime ? new Date(body.endDateTime) : existing.endAt;
    if (endAt.getTime() <= startAt.getTime()) {
      throw new HttpError(400, "O fim do compromisso deve ser depois do início");
    }

    const updated = await prisma.calendarEvent.update({
      where: { id: existing.id },
      data: {
        title: body.summary,
        description: body.description,
        startAt,
        endAt,
        reminderMinutes: body.reminderMinutes,
      },
    });

    res.json({ event: serializeEvent(updated) });
  })
);

calendarRouter.delete(
  "/events/:eventId",
  requireAuth,
  requireRole(Role.COLABORADOR, Role.GESTOR),
  asyncHandler(async (req, res) => {
    const { count } = await prisma.calendarEvent.deleteMany({
      where: { id: req.params.eventId, userId: req.user!.id },
    });
    if (count === 0) throw new HttpError(404, "Compromisso não encontrado");
    res.status(204).send();
  })
);
