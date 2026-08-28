import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/requests/StatusBadge";
import { fetchHistory } from "@/api/requests";
import type { HistoryFilters } from "@/api/requests";

function formatDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleDateString("pt-BR") : "-";
}

const EMPTY_FILTERS: HistoryFilters = {};

export function HistoryPage() {
  const [draft, setDraft] = React.useState<HistoryFilters>({});
  const [filters, setFilters] = React.useState<HistoryFilters>(EMPTY_FILTERS);

  const { data, isLoading } = useQuery({ queryKey: ["history", filters], queryFn: () => fetchHistory(filters) });
  const requests = data?.requests ?? [];

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setFilters(draft);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Histórico</h1>
        <p className="text-sm text-muted-foreground">Consulte solicitações já finalizadas.</p>
      </div>

      <form onSubmit={handleSearch} className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="solicitante">Solicitante</Label>
          <Input
            id="solicitante"
            value={draft.solicitante ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, solicitante: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="setor">Setor</Label>
          <Input id="setor" value={draft.setor ?? ""} onChange={(e) => setDraft((d) => ({ ...d, setor: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="loja">Loja</Label>
          <Input id="loja" value={draft.loja ?? ""} onChange={(e) => setDraft((d) => ({ ...d, loja: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="advertido">Pessoa advertida</Label>
          <Input
            id="advertido"
            value={draft.advertido ?? ""}
            onChange={(e) => setDraft((d) => ({ ...d, advertido: e.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dataInicio">De</Label>
          <Input
            id="dataInicio"
            type="date"
            onChange={(e) => setDraft((d) => ({ ...d, dataInicio: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dataFim">Até</Label>
          <Input
            id="dataFim"
            type="date"
            onChange={(e) => setDraft((d) => ({ ...d, dataFim: e.target.value ? new Date(e.target.value).toISOString() : undefined }))}
          />
        </div>
        <div className="col-span-full flex justify-end">
          <Button type="submit">
            <Search /> Buscar
          </Button>
        </div>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : requests.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nenhuma solicitação finalizada encontrada.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Solicitante</TableHead>
              <TableHead>Setor / Loja</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Finalizada em</TableHead>
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
                <TableCell>{formatDate(request.closedAt)}</TableCell>
                <TableCell>
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
