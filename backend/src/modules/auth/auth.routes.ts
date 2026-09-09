import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../lib/jwt";
import { publicFileUrl } from "../../lib/s3";
import { asyncHandler, HttpError } from "../../middleware/error.middleware";
import { requireAuth } from "../../middleware/auth.middleware";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function publicUser(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  setor: string;
  loja: string;
  cidade: string;
  estado: string;
  cargo: string | null;
  avatarKey: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    setor: user.setor,
    loja: user.loja,
    cidade: user.cidade,
    estado: user.estado,
    cargo: user.cargo,
    avatarUrl: user.avatarKey ? publicFileUrl(user.avatarKey) : null,
  };
}

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new HttpError(401, "Credenciais inválidas");

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) throw new HttpError(401, "Credenciais inválidas");

    if (!user.active) throw new HttpError(401, "Credenciais inativas");
    if (!user.hasLicense) throw new HttpError(401, "Credenciais sem licença de uso");

    const token = signToken({ sub: user.id, role: user.role });
    res.json({ token, user: publicUser(user) });
  })
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
    res.json({ user: publicUser(user) });
  })
);

const updateMeSchema = z.object({
  name: z.string().min(1).optional(),
  setor: z.string().min(1).optional(),
  cargo: z.string().min(1).nullable().optional(),
  email: z.string().email().optional(),
  avatarKey: z.string().min(1).nullable().optional(),
});

authRouter.patch(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = updateMeSchema.parse(req.body);

    if (data.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing && existing.id !== req.user!.id) {
        throw new HttpError(409, "Este e-mail já está em uso por outra conta");
      }
    }

    const updated = await prisma.user.update({ where: { id: req.user!.id }, data });
    res.json({ user: publicUser(updated) });
  })
);
