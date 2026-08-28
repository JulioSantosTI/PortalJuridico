import { apiRequest } from "./client";
import type { RequestType } from "@/lib/types";

export function fetchRequestTypes() {
  return apiRequest<{ requestTypes: RequestType[] }>("/request-types");
}
