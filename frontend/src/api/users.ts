import { apiRequest } from "./client";
import type { Role } from "@/lib/types";

export interface Colaborador {
  id: string;
  name: string;
  role: Role;
}

export function fetchColaboradores() {
  return apiRequest<{ colaboradores: Colaborador[] }>("/users/colaboradores");
}
