import { google } from "googleapis";
import type { calendar_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "./prisma";
import { encrypt, decrypt } from "./crypto";
import { HttpError } from "../middleware/error.middleware";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/userinfo.email"];

function buildOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, process.env.GOOGLE_REDIRECT_URI);
}

export function buildAuthUrl(state: string): string {
  const client = buildOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function exchangeCodeAndSaveAccount(userId: string, code: string): Promise<void> {
  const client = buildOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token || !tokens.access_token || !tokens.expiry_date) {
    throw new HttpError(400, "O Google não retornou um refresh token. Tente conectar novamente removendo o acesso do app em myaccount.google.com/permissions primeiro.");
  }
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ auth: client, version: "v2" });
  const { data: userInfo } = await oauth2.userinfo.get();

  await prisma.googleAccount.upsert({
    where: { userId },
    update: {
      googleEmail: userInfo.email ?? "",
      accessTokenEnc: encrypt(tokens.access_token),
      refreshTokenEnc: encrypt(tokens.refresh_token),
      expiryDate: new Date(tokens.expiry_date),
      scope: tokens.scope ?? SCOPES.join(" "),
    },
    create: {
      userId,
      googleEmail: userInfo.email ?? "",
      accessTokenEnc: encrypt(tokens.access_token),
      refreshTokenEnc: encrypt(tokens.refresh_token),
      expiryDate: new Date(tokens.expiry_date),
      scope: tokens.scope ?? SCOPES.join(" "),
    },
  });
}

// Monta um client OAuth2 autorizado para agir em nome de um usuário específico,
// carregando o refresh token salvo e persistindo automaticamente o access token
// renovado de volta no banco quando a lib do Google fizer o refresh sozinha.
export async function getAuthorizedClientForUser(userId: string): Promise<OAuth2Client> {
  const account = await prisma.googleAccount.findUnique({ where: { userId } });
  if (!account) {
    throw new HttpError(400, "Este usuário ainda não conectou a conta Google");
  }

  const client = buildOAuthClient();
  client.setCredentials({
    access_token: decrypt(account.accessTokenEnc),
    refresh_token: decrypt(account.refreshTokenEnc),
    expiry_date: account.expiryDate.getTime(),
  });

  client.on("tokens", (tokens) => {
    if (!tokens.access_token || !tokens.expiry_date) return;
    prisma.googleAccount
      .update({
        where: { userId },
        data: {
          accessTokenEnc: encrypt(tokens.access_token),
          expiryDate: new Date(tokens.expiry_date),
          ...(tokens.refresh_token ? { refreshTokenEnc: encrypt(tokens.refresh_token) } : {}),
        },
      })
      .catch((err: unknown) => console.error("Falha ao persistir token renovado do Google:", err));
  });

  return client;
}

export function getCalendarClient(auth: OAuth2Client): calendar_v3.Calendar {
  return google.calendar({ version: "v3", auth });
}
