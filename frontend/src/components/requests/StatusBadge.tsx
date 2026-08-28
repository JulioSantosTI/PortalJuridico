import { Badge } from "@/components/ui/badge";
import type { RequestStatus } from "@/lib/types";

const CONFIG: Record<RequestStatus, { label: string; variant: "muted" | "warning" | "success" }> = {
  ABERTO: { label: "Aberto", variant: "muted" },
  EM_ANDAMENTO: { label: "Em andamento", variant: "warning" },
  FINALIZADO: { label: "Finalizado", variant: "success" },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const config = CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
