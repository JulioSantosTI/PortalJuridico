import { Request, Response, NextFunction } from "express";
import { verifyAdminToken } from "../lib/adminJwt";

declare global {
  namespace Express {
    interface Request {
      admin?: { id: string };
    }
  }
}

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token não informado" });
  }

  try {
    const payload = verifyAdminToken(header.slice("Bearer ".length));
    req.admin = { id: payload.sub };
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
