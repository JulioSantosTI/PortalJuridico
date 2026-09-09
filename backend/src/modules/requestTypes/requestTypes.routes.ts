import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler, HttpError } from "../../middleware/error.middleware";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const requestTypesRouter = Router();

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (combining diacritical marks)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

requestTypesRouter.get(
  "/",
  requireAuth,
  asyncHandler(async (_req, res) => {
    const types = await prisma.requestType.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    res.json({ requestTypes: types });
  })
);

const createTypeSchema = z.object({
  name: z.string().min(1),
  slaBusinessDays: z.number().int().min(1),
});

// Preferências do sistema: o gestor cadastra um novo tipo de solicitação
// (nome + prazo). O slug é derivado do nome; se colidir com um já existente,
// recusa em vez de sobrescrever silenciosamente.
requestTypesRouter.post(
  "/",
  requireAuth,
  requireRole(Role.GESTOR),
  asyncHandler(async (req, res) => {
    const { name, slaBusinessDays } = createTypeSchema.parse(req.body);

    const slug = slugify(name);
    if (!slug) throw new HttpError(400, "Nome inválido");

    const existing = await prisma.requestType.findUnique({ where: { slug } });
    if (existing) throw new HttpError(409, "Já existe um tipo de solicitação com esse nome");

    const created = await prisma.requestType.create({ data: { name, slug, slaBusinessDays } });
    res.status(201).json({ requestType: created });
  })
);

const updateSlaSchema = z.object({
  slaBusinessDays: z.number().int().min(1),
});

// Preferências do sistema: o gestor define o prazo (em dias úteis) de cada
// tipo de chamado. É esse valor que aparece pro usuário na Nova Solicitação.
requestTypesRouter.patch(
  "/:id",
  requireAuth,
  requireRole(Role.GESTOR),
  asyncHandler(async (req, res) => {
    const { slaBusinessDays } = updateSlaSchema.parse(req.body);

    const existing = await prisma.requestType.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new HttpError(404, "Tipo de solicitação não encontrado");

    const updated = await prisma.requestType.update({
      where: { id: req.params.id },
      data: { slaBusinessDays },
    });

    res.json({ requestType: updated });
  })
);
