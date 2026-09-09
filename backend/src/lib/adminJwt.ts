import jwt from "jsonwebtoken";

export interface AdminTokenPayload {
  sub: string;
}

const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET as string;
const ADMIN_JWT_EXPIRES_IN = process.env.ADMIN_JWT_EXPIRES_IN || "8h";

if (!ADMIN_JWT_SECRET) {
  throw new Error("ADMIN_JWT_SECRET não definido no ambiente");
}

export function signAdminToken(payload: AdminTokenPayload): string {
  return jwt.sign(payload, ADMIN_JWT_SECRET, { expiresIn: ADMIN_JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  return jwt.verify(token, ADMIN_JWT_SECRET) as AdminTokenPayload;
}
