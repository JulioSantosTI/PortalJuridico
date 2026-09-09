import { apiRequest } from "./client";
import type { CompanyUser, CompanyUserRoleFilter, Role } from "@/lib/types";

export interface Colaborador {
  id: string;
  name: string;
  role: Role;
}

export function fetchColaboradores() {
  return apiRequest<{ colaboradores: Colaborador[] }>("/users/colaboradores");
}

export function fetchCompanyUsers(role: CompanyUserRoleFilter = "TODOS") {
  return apiRequest<{ users: CompanyUser[] }>("/users", { query: { role } });
}

export function fetchCompanyUserById(id: string) {
  return apiRequest<{ user: CompanyUser }>(`/users/${id}`);
}
