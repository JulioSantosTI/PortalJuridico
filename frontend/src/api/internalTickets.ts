import { apiRequest } from "./client";
import type { AttachmentInput, InternalTicket, InternalTicketDetail } from "@/lib/types";

export interface CreateInternalTicketPayload {
  tipo: string;
  mensagem: string;
  attachments?: AttachmentInput[];
}

export function createInternalTicket(payload: CreateInternalTicketPayload) {
  return apiRequest<{ ticket: InternalTicketDetail }>("/internal-tickets", { method: "POST", body: payload });
}

export function fetchMyInternalTickets() {
  return apiRequest<{ tickets: InternalTicket[] }>("/internal-tickets/mine");
}

export function fetchInternalTicketById(id: string) {
  return apiRequest<{ ticket: InternalTicketDetail }>(`/internal-tickets/${id}`);
}

export interface ReplyToInternalTicketPayload {
  message: string;
  attachments?: AttachmentInput[];
}

export function replyToInternalTicket(id: string, payload: ReplyToInternalTicketPayload) {
  return apiRequest<{ ticket: InternalTicketDetail }>(`/internal-tickets/${id}/interactions`, {
    method: "POST",
    body: payload,
  });
}
