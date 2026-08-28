import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/requests/StatusBadge";
import { DeadlineBadge } from "@/components/requests/DeadlineBadge";
import { fetchMyRequests } from "@/api/requests";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function MyRequestsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["myRequests"], queryFn: fetchMyRequests });
  const requests = data?.requests ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Minhas Solicitações</h1>
          <p className="text-sm text-muted-foreground">Acompanhe o andamento das solicitações que você abriu.</p>
        </div>
        <Button asChild>
          <Link to="/solicitacoes/nova">
            <FilePlus2 /> Nova Solicitação
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : requests.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Você ainda não abriu nenhuma solicitação.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Prazo</TableHead>
              <TableHead>Aberta em</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.requestType.name}</TableCell>
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
                <TableCell>{formatDate(request.createdAt)}</TableCell>
                <TableCell>
                  <Link to={`/solicitacoes/${request.id}`} className="text-sm font-medium text-primary hover:underline">
                    Ver detalhes
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
