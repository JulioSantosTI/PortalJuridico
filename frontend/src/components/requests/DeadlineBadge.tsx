import { Badge } from "@/components/ui/badge";

export function DeadlineBadge({
  diasUteisRestantes,
  atrasado,
  status,
}: {
  diasUteisRestantes: number;
  atrasado: boolean;
  status: string;
}) {
  if (status === "FINALIZADO") {
    return <Badge variant="muted">Concluído no prazo{diasUteisRestantes < 0 ? " com atraso" : ""}</Badge>;
  }
  if (atrasado) {
    return <Badge variant="destructive">Atrasado ({Math.abs(diasUteisRestantes)}d)</Badge>;
  }
  if (diasUteisRestantes === 0) {
    return <Badge variant="warning">Vence hoje</Badge>;
  }
  const isSingular = diasUteisRestantes === 1;
  return (
    <Badge variant="secondary">
      {diasUteisRestantes} {isSingular ? "dia útil restante" : "dias úteis restantes"}
    </Badge>
  );
}
