// Sem VITE_API_URL definida, assume que o backend está na mesma máquina que serviu o
// front (porta 3333) — assim funciona tanto em localhost quanto acessando por IP na rede.
const API_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:3333/api`;
const TOKEN_KEY = "portal-juridico:token";

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | undefined>;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${API_URL}${path}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, value);
    }
  }

  const token = getToken();
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
      clearToken();
      window.dispatchEvent(new Event("auth:unauthorized"));
    }
    throw new ApiError(response.status, data?.error ?? "Erro inesperado", data?.details);
  }

  return data as T;
}
