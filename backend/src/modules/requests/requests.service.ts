import { RequestStatus } from "@prisma/client";
import { remainingBusinessDays } from "../../lib/businessDays";
import { publicFileUrl } from "../../lib/s3";

type WithAttachments = { attachments?: { storageKey: string }[] };
type WithInteractions = { interactions?: (WithAttachments & Record<string, unknown>)[] };

function withFileUrl<T extends { storageKey: string }>(attachment: T): T & { fileUrl: string } {
  return { ...attachment, fileUrl: publicFileUrl(attachment.storageKey) };
}

export function serializeWithCountdown<T extends { dueDate: Date; status: RequestStatus } & WithAttachments & WithInteractions>(
  request: T
): T & { diasUteisRestantes: number; atrasado: boolean } {
  const diasUteisRestantes = remainingBusinessDays(request.dueDate);
  return {
    ...request,
    attachments: request.attachments?.map(withFileUrl),
    interactions: request.interactions?.map((interaction) => ({
      ...interaction,
      attachments: interaction.attachments?.map(withFileUrl),
    })),
    diasUteisRestantes,
    atrasado: request.status !== "FINALIZADO" && diasUteisRestantes < 0,
  };
}
