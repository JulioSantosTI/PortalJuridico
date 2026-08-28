import { apiRequest } from "./client";
import type { AttachmentInput, RequestDetail, RequestStatus, RequestSummary } from "@/lib/types";

export interface CreateRequestPayload {
  requestTypeSlug: string;
  requesterSetor: string;
  requesterLoja: string;
  advertidoNome?: string;
  motivo?: string;
  descricaoRevisao?: string;
  attachments?: AttachmentInput[];
}

export function createRequest(payload: CreateRequestPayload) {
  return apiRequest<{ request: RequestDetail }>("/requests", { method: "POST", body: payload });
}

export function fetchMyRequests() {
  return apiRequest<{ requests: RequestSummary[] }>("/requests/mine");
}

export interface QueueFilters {
  status?: RequestStatus;
  requestTypeId?: string;
  assignedToId?: string;
}

export function fetchQueue(filters: QueueFilters = {}) {
  return apiRequest<{ requests: RequestSummary[] }>("/requests", { query: { ...filters } });
}

export function fetchRequestById(id: string) {
  return apiRequest<{ request: RequestDetail }>(`/requests/${id}`);
}

export function assignRequest(id: string, assignedToId: string) {
  return apiRequest<{ request: RequestDetail }>(`/requests/${id}/assign`, {
    method: "PATCH",
    body: { assignedToId },
  });
}

export interface HistoryFilters {
  solicitante?: string;
  setor?: string;
  loja?: string;
  advertido?: string;
  dataInicio?: string;
  dataFim?: string;
}

export function fetchHistory(filters: HistoryFilters = {}) {
  return apiRequest<{ requests: RequestSummary[] }>("/requests/history", { query: { ...filters } });
}
