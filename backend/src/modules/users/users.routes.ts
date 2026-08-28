import { Router } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler } from "../../middleware/error.middleware";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const usersRouter = Router();

// Lista colaboradores/gestores disponíveis para atribuição de solicitações.
usersRouter.get(
  "/colaboradores",
  requireAuth,
  requireRole(Role.COLABORADOR, Role.GESTOR),
  asyncHandler(async (_req, res) => {
    const colaboradores = await prisma.user.findMany({
      where: { role: { in: [Role.COLABORADOR, Role.GESTOR] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
    res.json({ colaboradores });
  })
);
