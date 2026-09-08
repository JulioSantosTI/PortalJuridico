import { apiRequest } from "./client";
import type { AccessRequest, AccessRequestStatus, LicensePoolInfo, RequestableRole } from "@/lib/types";

export interface SubmitAccessRequestPayload {
  name: string;
  email: string;
  password: string;
  setor: string;
  loja: string;
  cidade: string;
  estado: string;
  requestedRole: RequestableRole;
}

export function submitAccessRequest(payload: SubmitAccessRequestPayload) {
  return apiRequest<{ request: AccessRequest }>("/access-requests", { method: "POST", body: payload });
}

export function fetchAccessRequests(status: AccessRequestStatus = "PENDENTE") {
  return apiRequest<{ requests: AccessRequest[] }>("/access-requests", { query: { status } });
}

export function approveAccessRequest(id: string) {
  return apiRequest<{ request: AccessRequest }>(`/access-requests/${id}/approve`, { method: "PATCH" });
}

export function rejectAccessRequest(id: string, reason?: string) {
  return apiRequest<{ request: AccessRequest }>(`/access-requests/${id}/reject`, {
    method: "PATCH",
    body: { reason },
  });
}

export function fetchLicensePools() {
  return apiRequest<{ licensePools: LicensePoolInfo[] }>("/access-requests/license-pools");
}
