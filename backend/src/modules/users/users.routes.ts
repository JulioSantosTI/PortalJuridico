import { Router } from "express";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { publicFileUrl } from "../../lib/s3";
import { asyncHandler, HttpError } from "../../middleware/error.middleware";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

export const usersRouter = Router();

const BROWSABLE_ROLES = [Role.COLABORADOR, Role.USUARIO] as const;

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  setor: true,
  loja: true,
  cidade: true,
  estado: true,
  cargo: true,
  avatarKey: true,
  active: true,
  createdAt: true,
} as const;

function withAvatarUrl<T extends { avatarKey: string | null }>(user: T) {
  const { avatarKey, ...rest } = user;
  return { ...rest, avatarUrl: avatarKey ? publicFileUrl(avatarKey) : null };
}

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

const listQuerySchema = z.object({
  role: z.enum(["COLABORADOR", "USUARIO", "TODOS"]).default("TODOS"),
});

// Navegador de usuários ativos da empresa, para o GESTOR consultar. "TODOS" usa
// duas queries separadas (não orderBy no enum) porque o enum nativo do Postgres
// ordena pela ordem de declaração (USUARIO, COLABORADOR, GESTOR), não alfabética —
// o pedido é colaborador sempre primeiro.
usersRouter.get(
  "/",
  requireAuth,
  requireRole(Role.GESTOR),
  asyncHandler(async (req, res) => {
    const { role } = listQuerySchema.parse(req.query);

    if (role === "TODOS") {
      const [colaboradores, usuarios] = await Promise.all([
        prisma.user.findMany({ where: { role: Role.COLABORADOR, active: true }, select: USER_SELECT, orderBy: { name: "asc" } }),
        prisma.user.findMany({ where: { role: Role.USUARIO, active: true }, select: USER_SELECT, orderBy: { name: "asc" } }),
      ]);
      res.json({ users: [...colaboradores, ...usuarios].map(withAvatarUrl) });
      return;
    }

    const users = await prisma.user.findMany({
      where: { role: role as Role, active: true },
      select: USER_SELECT,
      orderBy: { name: "asc" },
    });
    res.json({ users: users.map(withAvatarUrl) });
  })
);

usersRouter.get(
  "/:id",
  requireAuth,
  requireRole(Role.GESTOR),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: USER_SELECT });
    if (!user || !user.active || !(BROWSABLE_ROLES as readonly Role[]).includes(user.role)) {
      throw new HttpError(404, "Usuário não encontrado");
    }
    res.json({ user: withAvatarUrl(user) });
  })
);
