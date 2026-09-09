import { Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { verifyToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: Role };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token não informado" });
  }

  let payload;
  try {
    payload = verifyToken(header.slice("Bearer ".length));
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }

  try {
    // Checagem no banco a cada requisição: garante que uma licença revogada
    // derruba a sessão já aberta na hora, não só bloqueia um novo login.
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { active: true, hasLicense: true, role: true },
    });
    if (!dbUser || !dbUser.active || !dbUser.hasLicense) {
      return res.status(401).json({ error: "Sessão encerrada. Faça login novamente." });
    }
    req.user = { id: payload.sub, role: dbUser.role };
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Acesso não permitido para este perfil" });
    }
    next();
  };
}
