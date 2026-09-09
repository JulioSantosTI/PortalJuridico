import { apiRequest } from "./client";
import type { User } from "@/lib/types";

export function login(email: string, password: string) {
  return apiRequest<{ token: string; user: User }>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function fetchMe() {
  return apiRequest<{ user: User }>("/auth/me");
}

export interface UpdateMePayload {
  name?: string;
  setor?: string;
  cargo?: string | null;
  email?: string;
  avatarKey?: string | null;
}

export function updateMe(payload: UpdateMePayload) {
  return apiRequest<{ user: User }>("/auth/me", { method: "PATCH", body: payload });
}
