import { apiRequest } from "./client";
import type { RequestType } from "@/lib/types";

export function fetchRequestTypes() {
  return apiRequest<{ requestTypes: RequestType[] }>("/request-types");
}

export function updateRequestTypeSla(id: string, slaBusinessDays: number) {
  return apiRequest<{ requestType: RequestType }>(`/request-types/${id}`, {
    method: "PATCH",
    body: { slaBusinessDays },
  });
}

export function createRequestType(payload: { name: string; slaBusinessDays: number }) {
  return apiRequest<{ requestType: RequestType }>("/request-types", {
    method: "POST",
    body: payload,
  });
}
