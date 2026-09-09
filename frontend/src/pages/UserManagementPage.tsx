import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/avatar";
import { approveAccessRequest, fetchAccessRequests, fetchLicensePools, rejectAccessRequest } from "@/api/accessRequests";
import { fetchCompanyUsers } from "@/api/users";
import { ApiError } from "@/api/client";
import type { AccessRequest, AccessRequestStatus, CompanyUserRoleFilter } from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  USUARIO: "Usuário",
  COLABORADOR: "Colaborador Jurídico",
};

function CompanyUsersTab() {
  const navigate = useNavigate();
  const [roleFilter, setRoleFilter] = React.useState<CompanyUserRoleFilter>("TODOS");

  const { data, isLoading } = useQuery({
    queryKey: ["companyUsers", roleFilter],
    queryFn: () => fetchCompanyUsers(roleFilter),
  });
  const users = data?.users ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="w-56">
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as CompanyUserRoleFilter)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TODOS">Todos</SelectItem>
            <SelectItem value="COLABORADOR">Colaborador Jurídico</SelectItem>
            <SelectItem value="USUARIO">Usuário</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : users.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nenhum usuário encontrado.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Avatar name={u.name} src={u.avatarUrl} size="sm" />
                    {u.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{u.cargo ?? "—"}</TableCell>
                <TableCell className="text-muted-foreground">{u.setor}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>{ROLE_LABEL[u.role]}</TableCell>
                <TableCell>
                  <button
                    onClick={() => navigate(`/usuarios/${u.id}`)}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Ver perfil
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

const STATUS_VARIANT: Record<AccessRequestStatus, "muted" | "success" | "destructive"> = {
  PENDENTE: "muted",
  APROVADO: "success",
  RECUSADO: "destructive",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export function UserManagementPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState<AccessRequestStatus>("PENDENTE");
  const [selected, setSelected] = React.useState<AccessRequest | null>(null);
  const [showReject, setShowReject] = React.useState(false);
  const [reason, setReason] = React.useState("");

  const { data: poolsData } = useQuery({ queryKey: ["licensePools"], queryFn: fetchLicensePools });
  const pools = poolsData?.licensePools ?? [];

  const { data: requestsData, isLoading } = useQuery({
    queryKey: ["accessRequests", tab],
    queryFn: () => fetchAccessRequests(tab),
  });
  const requests = requestsData?.requests ?? [];

  function closeDialog() {
    setSelected(null);
    setShowReject(false);
    setReason("");
  }

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["accessRequests"] });
    queryClient.invalidateQueries({ queryKey: ["licensePools"] });
  }

  const approveMutation = useMutation({
    mutationFn: approveAccessRequest,
    onSuccess: () => {
      toast.success("Solicitação aprovada. A conta já pode ser usada.");
      closeDialog();
      invalidateAll();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível aprovar.");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => rejectAccessRequest(id, reason),
    onSuccess: () => {
      toast.success("Solicitação recusada.");
      closeDialog();
      invalidateAll();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível recusar.");
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Gerenciamento de Usuários</h1>
        <p className="text-sm text-muted-foreground">Licenças contratadas, solicitações de acesso e usuários da empresa.</p>
      </div>

      <Tabs defaultValue="solicitacoes">
        <TabsList>
          <TabsTrigger value="solicitacoes">Solicitações de Acesso</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
        </TabsList>

        <TabsContent value="solicitacoes">
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {pools.map((pool) => (
              <Card key={pool.role}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">{ROLE_LABEL[pool.role]}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">
                    {pool.available}
                    <span className="text-sm font-normal text-muted-foreground"> disponíveis</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {pool.usedLicenses} em uso de {pool.totalLicenses} licenças
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as AccessRequestStatus)}>
            <TabsList>
              <TabsTrigger value="PENDENTE">Pendentes</TabsTrigger>
              <TabsTrigger value="APROVADO">Aprovadas</TabsTrigger>
              <TabsTrigger value="RECUSADO">Recusadas</TabsTrigger>
            </TabsList>
            <TabsContent value={tab}>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : requests.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
                  Nenhuma solicitação aqui.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Setor / Loja</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-muted-foreground">{r.email}</TableCell>
                        <TableCell>{ROLE_LABEL[r.requestedRole]}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.setor} / {r.loja}
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(r.createdAt)}</TableCell>
                        <TableCell>
                          <button
                            onClick={() => setSelected(r)}
                            className="text-sm font-medium text-primary hover:underline"
                          >
                            Ver
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="usuarios">
          <CompanyUsersTab />
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">E-mail</p>
                  <p className="font-medium">{selected.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tipo de acesso</p>
                  <p className="font-medium">{ROLE_LABEL[selected.requestedRole]}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Setor</p>
                  <p className="font-medium">{selected.setor}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Loja</p>
                  <p className="font-medium">{selected.loja}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Cidade / Estado</p>
                  <p className="font-medium">
                    {selected.cidade} / {selected.estado}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Enviado em</p>
                  <p className="font-medium">{formatDate(selected.createdAt)}</p>
                </div>
                {selected.status === "RECUSADO" && selected.rejectionReason && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Motivo da recusa</p>
                    <p className="font-medium">{selected.rejectionReason}</p>
                  </div>
                )}
              </div>

              {selected.status === "PENDENTE" && (
                <div className="mt-6 flex flex-col gap-3">
                  {showReject ? (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="reason">Motivo da recusa (opcional)</Label>
                        <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          disabled={rejectMutation.isPending}
                          onClick={() => rejectMutation.mutate({ id: selected.id, reason: reason || undefined })}
                        >
                          Confirmar recusa
                        </Button>
                        <Button variant="outline" onClick={() => setShowReject(false)}>
                          Voltar
                        </Button>
                      </div>
                    </>
                  ) : (
                    <div className="flex gap-2">
                      <Button disabled={approveMutation.isPending} onClick={() => approveMutation.mutate(selected.id)}>
                        Aprovar
                      </Button>
                      <Button variant="outline" onClick={() => setShowReject(true)}>
                        Recusar
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
