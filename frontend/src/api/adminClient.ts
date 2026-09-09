// Espelha api/client.ts, mas com chave de token e evento de "sessão expirada"
// próprios — login de empresa e login master convivem sem se atropelar.
const API_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3333/api`;
const ADMIN_TOKEN_KEY = "portal-juridico:admin-token";

export class AdminApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function getAdminToken(): string | null {
  return localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | undefined>;
}

export async function adminApiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, value);
    }
  }

  const token = getAdminToken();
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : undefined;

  if (!response.ok) {
    if (response.status === 401) {
      clearAdminToken();
      window.dispatchEvent(new Event("admin-auth:unauthorized"));
    }
    throw new AdminApiError(response.status, data?.error ?? "Erro inesperado", data?.details);
  }

  return data as T;
}
