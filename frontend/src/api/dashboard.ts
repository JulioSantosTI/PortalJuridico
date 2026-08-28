import { apiRequest } from "./client";
import type { DashboardKpis } from "@/lib/types";

export function fetchDashboardKpis() {
  return apiRequest<DashboardKpis>("/dashboard/kpis");
}
