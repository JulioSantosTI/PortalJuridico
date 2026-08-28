import { apiRequest } from "./client";
import type { AttachmentInput, RequestDetail, RequestStatus } from "@/lib/types";

export interface CreateInteractionPayload {
  message: string;
  statusChangeTo?: RequestStatus;
  attachments?: AttachmentInput[];
}

export function createInteraction(requestId: string, payload: CreateInteractionPayload) {
  return apiRequest<{ request: RequestDetail }>(`/requests/${requestId}/interactions`, {
    method: "POST",
    body: payload,
  });
}
