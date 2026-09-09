import { RequestStatus } from "@prisma/client";
import { remainingBusinessDays } from "../../lib/businessDays";
import { publicFileUrl } from "../../lib/s3";

type WithAttachments = { attachments?: { storageKey: string }[] };
type WithAuthor = { author?: { avatarKey: string | null } & Record<string, unknown> };
type WithInteractions = { interactions?: (WithAttachments & WithAuthor & Record<string, unknown>)[] };

function withFileUrl<T extends { storageKey: string }>(attachment: T): T & { fileUrl: string } {
  return { ...attachment, fileUrl: publicFileUrl(attachment.storageKey) };
}

function withAuthorAvatarUrl<T extends { avatarKey: string | null }>(author: T) {
  const { avatarKey, ...rest } = author;
  return { ...rest, avatarUrl: avatarKey ? publicFileUrl(avatarKey) : null };
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
      author: interaction.author ? withAuthorAvatarUrl(interaction.author) : interaction.author,
    })),
    diasUteisRestantes,
    atrasado: request.status !== "FINALIZADO" && diasUteisRestantes < 0,
  };
}
