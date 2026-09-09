import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import {
  assignUserLicense,
  deactivateUser,
  fetchAdminLicensePools,
  fetchAdminUsers,
  fetchInternalTickets,
  reactivateUser,
  resolveInternalTicket,
  revokeUserLicense,
  updateLicensePool,
} from "@/api/admin";
import { AdminApiError } from "@/api/adminClient";
import { useAdminAuth } from "@/context/AdminAuthContext";
import type { AdminUser, AdminUserStatus, InternalTicketStatus, LicensePoolInfo } from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  USUARIO: "Usuário",
  COLABORADOR: "Colaborador Jurídico",
  GESTOR: "Gestor",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

function LicensePoolCard({ role, totalLicenses, usedLicenses, available }: LicensePoolInfo) {
  const queryClient = useQueryClient();
  const [value, setValue] = React.useState(String(totalLicenses));

  React.useEffect(() => setValue(String(totalLicenses)), [totalLicenses]);

  const mutation = useMutation({
    mutationFn: (n: number) => updateLicensePool(role, n),
    onSuccess: () => {
      toast.success("Licenças atualizadas.");
      queryClient.invalidateQueries({ queryKey: ["adminLicensePools"] });
    },
    onError: (err) => {
      toast.error(err instanceof AdminApiError ? err.message : "Não foi possível salvar.");
      setValue(String(totalLicenses));
    },
  });

  const dirty = value !== String(totalLicenses);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{ROLE_LABEL[role]}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">
          {usedLicenses} em uso · {available} disponíveis
        </p>
        <div className="flex items-center gap-2">
          <Label htmlFor={`total-${role}`} className="sr-only">
            Total de licenças — {ROLE_LABEL[role]}
          </Label>
          <Input
            id={`total-${role}`}
            type="number"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-24"
          />
          <Button size="sm" disabled={!dirty || mutation.isPending} onClick={() => mutation.mutate(Number(value))}>
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function UsersTable({
  status,
  emptyLabel,
  renderActions,
}: {
  status: AdminUserStatus;
  emptyLabel: string;
  renderActions: (user: AdminUser) => React.ReactNode;
}) {
  const { data, isLoading } = useQuery({ queryKey: ["adminUsers", status], queryFn: () => fetchAdminUsers(status) });
  const users = data?.users ?? [];

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>E-mail</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Setor / Loja</TableHead>
          {status === "CADASTRADOS" && <TableHead>Status</TableHead>}
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((u) => (
          <TableRow key={u.id}>
            <TableCell className="font-medium">{u.name}</TableCell>
            <TableCell className="text-muted-foreground">{u.email}</TableCell>
            <TableCell>{ROLE_LABEL[u.role]}</TableCell>
            <TableCell className="text-muted-foreground">
              {u.setor} / {u.loja}
            </TableCell>
            {status === "CADASTRADOS" && (
              <TableCell>
                <Badge variant={u.hasLicense ? "success" : "muted"}>{u.hasLicense ? "Com licença" : "Sem licença"}</Badge>
              </TableCell>
            )}
            <TableCell>
              <div className="flex justify-end gap-2">{renderActions(u)}</div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function InternalTicketsList({ status }: { status: InternalTicketStatus }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["internalTickets", status],
    queryFn: () => fetchInternalTickets(status),
  });
  const tickets = data?.tickets ?? [];

  const resolveMutation = useMutation({
    mutationFn: (id: string) => resolveInternalTicket(id),
    onSuccess: () => {
      toast.success("Chamado marcado como resolvido.");
      queryClient.invalidateQueries({ queryKey: ["internalTickets"] });
    },
    onError: (err) => toast.error(err instanceof AdminApiError ? err.message : "Não foi possível resolver o chamado."),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (tickets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        {status === "ABERTO" ? "Nenhum chamado aberto." : "Nenhum chamado resolvido ainda."}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {tickets.map((t) => (
        <li key={t.id} className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <Badge variant="secondary">{t.tipo}</Badge>
            <span className="text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</span>
          </div>
          <p className="text-sm">{t.mensagem}</p>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
            <div className="flex items-center gap-2">
              <Avatar name={t.author.name} src={t.author.avatarUrl} size="sm" />
              <div className="leading-tight">
                <p className="text-xs font-medium">{t.author.name}</p>
                <p className="text-xs text-muted-foreground">
                  {ROLE_LABEL[t.author.role]}
                  {t.author.cargo ? ` · ${t.author.cargo}` : ""} · {t.author.setor}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/admin/chamados/${t.id}`)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver conversa{t._count ? ` (${t._count.interactions})` : ""}
              </button>
              {status === "ABERTO" && (
                <Button size="sm" disabled={resolveMutation.isPending} onClick={() => resolveMutation.mutate(t.id)}>
                  Marcar como resolvido
                </Button>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function AdminDashboardPage() {
  const { admin, logout } = useAdminAuth();
  const queryClient = useQueryClient();

  const { data: poolsData } = useQuery({ queryKey: ["adminLicensePools"], queryFn: fetchAdminLicensePools });
  const pools = poolsData?.licensePools ?? [];

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    queryClient.invalidateQueries({ queryKey: ["adminLicensePools"] });
  }

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeUserLicense(id),
    onSuccess: () => {
      toast.success("Licença revogada. O acesso do usuário foi encerrado imediatamente.");
      invalidateAll();
    },
    onError: (err) => toast.error(err instanceof AdminApiError ? err.message : "Não foi possível revogar a licença."),
  });

  const assignMutation = useMutation({
    mutationFn: (id: string) => assignUserLicense(id),
    onSuccess: () => {
      toast.success("Licença atribuída.");
      invalidateAll();
    },
    onError: (err) => toast.error(err instanceof AdminApiError ? err.message : "Não foi possível atribuir a licença."),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onSuccess: () => {
      toast.success("Conta desativada. O acesso do usuário foi encerrado imediatamente.");
      invalidateAll();
    },
    onError: (err) => toast.error(err instanceof AdminApiError ? err.message : "Não foi possível desativar a conta."),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => reactivateUser(id),
    onSuccess: () => {
      toast.success("Conta reativada. Atribua uma licença para liberar o acesso.");
      invalidateAll();
    },
    onError: (err) => toast.error(err instanceof AdminApiError ? err.message : "Não foi possível reativar a conta."),
  });

  const anyPending =
    revokeMutation.isPending || assignMutation.isPending || deactivateMutation.isPending || reactivateMutation.isPending;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Painel Administrativo</h1>
          <p className="text-sm text-muted-foreground">{admin?.email}</p>
        </div>
        <Button variant="outline" onClick={logout}>
          Sair
        </Button>
      </div>

      <Tabs defaultValue="licencas">
        <TabsList>
          <TabsTrigger value="licencas">Licenças</TabsTrigger>
          <TabsTrigger value="chamados">Chamados Internos</TabsTrigger>
        </TabsList>

        <TabsContent value="licencas">
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
            {pools.map((pool: LicensePoolInfo) => (
              <LicensePoolCard key={pool.role} {...pool} />
            ))}
          </div>

          <Tabs defaultValue="CADASTRADOS">
            <TabsList>
              <TabsTrigger value="COM_LICENCA">Com Licença</TabsTrigger>
              <TabsTrigger value="CADASTRADOS">Cadastrados</TabsTrigger>
              <TabsTrigger value="INATIVO">Inativos</TabsTrigger>
            </TabsList>

            <TabsContent value="COM_LICENCA">
              <UsersTable
                status="COM_LICENCA"
                emptyLabel="Nenhum usuário com licença ativa."
                renderActions={(u) => (
                  <Button size="sm" variant="destructive" disabled={anyPending} onClick={() => revokeMutation.mutate(u.id)}>
                    Revogar licença
                  </Button>
                )}
              />
            </TabsContent>

            <TabsContent value="CADASTRADOS">
              <UsersTable
                status="CADASTRADOS"
                emptyLabel="Nenhum usuário cadastrado."
                renderActions={(u) => (
                  <>
                    {u.hasLicense ? (
                      <Button size="sm" variant="destructive" disabled={anyPending} onClick={() => revokeMutation.mutate(u.id)}>
                        Revogar licença
                      </Button>
                    ) : (
                      <Button size="sm" disabled={anyPending} onClick={() => assignMutation.mutate(u.id)}>
                        Atribuir licença
                      </Button>
                    )}
                    <Button size="sm" variant="outline" disabled={anyPending} onClick={() => deactivateMutation.mutate(u.id)}>
                      Desativar conta
                    </Button>
                  </>
                )}
              />
            </TabsContent>

            <TabsContent value="INATIVO">
              <UsersTable
                status="INATIVO"
                emptyLabel="Nenhum usuário inativo."
                renderActions={(u) => (
                  <Button size="sm" disabled={anyPending} onClick={() => reactivateMutation.mutate(u.id)}>
                    Reativar
                  </Button>
                )}
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="chamados">
          <Tabs defaultValue="ABERTO">
            <TabsList>
              <TabsTrigger value="ABERTO">Abertos</TabsTrigger>
              <TabsTrigger value="RESOLVIDO">Resolvidos</TabsTrigger>
            </TabsList>
            <TabsContent value="ABERTO">
              <InternalTicketsList status="ABERTO" />
            </TabsContent>
            <TabsContent value="RESOLVIDO">
              <InternalTicketsList status="RESOLVIDO" />
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
