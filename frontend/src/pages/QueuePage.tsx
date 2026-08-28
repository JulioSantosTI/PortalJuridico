import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/requests/StatusBadge";
import { DeadlineBadge } from "@/components/requests/DeadlineBadge";
import { useAuth } from "@/context/AuthContext";
import { assignRequest, fetchQueue } from "@/api/requests";
import { fetchRequestTypes } from "@/api/requestTypes";
import { fetchColaboradores } from "@/api/users";
import { ApiError } from "@/api/client";
import type { RequestStatus } from "@/lib/types";

const STATUS_OPTIONS: { value: RequestStatus; label: string }[] = [
  { value: "ABERTO", label: "Aberto" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "FINALIZADO", label: "Finalizado" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function QueuePage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = React.useState<string>("");
  const [requestTypeId, setRequestTypeId] = React.useState<string>("");

  const filters = {
    status: (status || undefined) as RequestStatus | undefined,
    requestTypeId: requestTypeId || undefined,
  };

  const { data, isLoading } = useQuery({ queryKey: ["queue", filters], queryFn: () => fetchQueue(filters) });
  const { data: typesData } = useQuery({ queryKey: ["requestTypes"], queryFn: fetchRequestTypes });
  const { data: colaboradoresData } = useQuery({
    queryKey: ["colaboradores"],
    queryFn: fetchColaboradores,
    enabled: user?.role === "GESTOR",
  });

  const requests = data?.requests ?? [];
  const requestTypes = typesData?.requestTypes ?? [];
  const colaboradores = colaboradoresData?.colaboradores ?? [];

  const assignMutation = useMutation({
    mutationFn: ({ id, assignedToId }: { id: string; assignedToId: string }) => assignRequest(id, assignedToId),
    onSuccess: () => {
      toast.success("Atribuição atualizada.");
      queryClient.invalidateQueries({ queryKey: ["queue"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível atribuir.");
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Fila Geral</h1>
        <p className="text-sm text-muted-foreground">Todas as solicitações abertas ao jurídico.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os status</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={requestTypeId} onValueChange={setRequestTypeId}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos os tipos</SelectItem>
            {requestTypes.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : requests.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nenhuma solicitação encontrada com esses filtros.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Solicitante</TableHead>
              <TableHead>Setor / Loja</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Aberta em</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.requester.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {request.requesterSetor} / {request.requesterLoja}
                </TableCell>
                <TableCell>{request.requestType.name}</TableCell>
                <TableCell>
                  <StatusBadge status={request.status} />
                </TableCell>
                <TableCell>
                  <DeadlineBadge
                    diasUteisRestantes={request.diasUteisRestantes}
                    atrasado={request.atrasado}
                    status={request.status}
                  />
                </TableCell>
                <TableCell>
                  {user?.role === "GESTOR" ? (
                    <Select
                      value={request.assignedTo?.id ?? ""}
                      onValueChange={(value) => assignMutation.mutate({ id: request.id, assignedToId: value })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Não atribuído" />
                      </SelectTrigger>
                      <SelectContent>
                        {colaboradores.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-muted-foreground">{request.assignedTo?.name ?? "Não atribuído"}</span>
                  )}
                </TableCell>
                <TableCell>{formatDate(request.createdAt)}</TableCell>
                <TableCell className="flex items-center gap-2">
                  {user?.role === "COLABORADOR" && request.assignedTo?.id !== user.id && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => assignMutation.mutate({ id: request.id, assignedToId: user.id })}
                    >
                      Assumir
                    </Button>
                  )}
                  <Link to={`/solicitacoes/${request.id}`} className="text-sm font-medium text-primary hover:underline">
                    Ver
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
