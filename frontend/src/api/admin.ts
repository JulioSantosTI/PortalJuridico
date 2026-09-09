import { adminApiRequest } from "./adminClient";
import type {
  AdminUser,
  AdminUserStatus,
  AttachmentInput,
  InternalTicket,
  InternalTicketDetail,
  InternalTicketStatus,
  LicensePoolInfo,
  RequestableRole,
} from "@/lib/types";

export interface PlatformAdmin {
  id: string;
  name: string;
  email: string;
}

export function adminLogin(email: string, password: string) {
  return adminApiRequest<{ token: string; admin: PlatformAdmin }>("/admin/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function fetchAdminMe() {
  return adminApiRequest<{ admin: PlatformAdmin }>("/admin/auth/me");
}

export function fetchAdminLicensePools() {
  return adminApiRequest<{ licensePools: LicensePoolInfo[] }>("/admin/license-pools");
}

export function updateLicensePool(role: RequestableRole, totalLicenses: number) {
  return adminApiRequest<{ licensePool: LicensePoolInfo }>(`/admin/license-pools/${role}`, {
    method: "PATCH",
    body: { totalLicenses },
  });
}

export function fetchAdminUsers(status: AdminUserStatus = "CADASTRADOS") {
  return adminApiRequest<{ users: AdminUser[] }>("/admin/users", { query: { status } });
}

export function revokeUserLicense(id: string) {
  return adminApiRequest<{ user: AdminUser }>(`/admin/users/${id}/revoke`, { method: "PATCH" });
}

export function assignUserLicense(id: string) {
  return adminApiRequest<{ user: AdminUser }>(`/admin/users/${id}/assign-license`, { method: "PATCH" });
}

export function deactivateUser(id: string) {
  return adminApiRequest<{ user: AdminUser }>(`/admin/users/${id}/deactivate`, { method: "PATCH" });
}

export function reactivateUser(id: string) {
  return adminApiRequest<{ user: AdminUser }>(`/admin/users/${id}/reactivate`, { method: "PATCH" });
}

export function fetchInternalTickets(status: InternalTicketStatus = "ABERTO") {
  return adminApiRequest<{ tickets: InternalTicket[] }>("/admin/internal-tickets", { query: { status } });
}

export function fetchAdminInternalTicketById(id: string) {
  return adminApiRequest<{ ticket: InternalTicketDetail }>(`/admin/internal-tickets/${id}`);
}

export function replyToInternalTicketAsAdmin(id: string, payload: { message: string; attachments?: AttachmentInput[] }) {
  return adminApiRequest<{ ticket: InternalTicketDetail }>(`/admin/internal-tickets/${id}/interactions`, {
    method: "POST",
    body: payload,
  });
}

export function resolveInternalTicket(id: string) {
  return adminApiRequest<{ ticket: InternalTicketDetail }>(`/admin/internal-tickets/${id}/resolve`, { method: "PATCH" });
}
