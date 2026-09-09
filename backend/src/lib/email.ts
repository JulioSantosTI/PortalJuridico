import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 1025,
  secure: false,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
});

const FROM = process.env.SMTP_FROM || "Portal Jurídico <noreply@portaljuridico.local>";

// Best-effort: nunca lança erro. Um problema no envio de e-mail não pode
// derrubar o fluxo principal (criar solicitação, atribuir, etc.) — só loga.
export async function sendEmail(to: string | string[], subject: string, text: string) {
  if (Array.isArray(to) ? to.length === 0 : !to) return;
  try {
    await transporter.sendMail({ from: FROM, to, subject, text });
  } catch (err) {
    console.error("Falha ao enviar e-mail:", err);
  }
}
