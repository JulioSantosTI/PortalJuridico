import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { signToken } from "../../lib/jwt";
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
