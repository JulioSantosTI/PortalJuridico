import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { FileUploadField } from "@/components/requests/FileUploadField";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useAuth } from "@/context/AuthContext";
import { createInternalTicket, fetchMyInternalTickets } from "@/api/internalTickets";
import { ApiError } from "@/api/client";
import type { InternalTicketStatus } from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  USUARIO: "Usuário",
  COLABORADOR: "Colaborador Jurídico",
  GESTOR: "Gestor",
};

const STATUS_VARIANT: Record<InternalTicketStatus, "muted" | "success"> = {
  ABERTO: "muted",
  RESOLVIDO: "success",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

function NovoChamadoTab({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [tipo, setTipo] = React.useState("");
  const [mensagem, setMensagem] = React.useState("");
  const upload = useFileUpload();

  const mutation = useMutation({
    mutationFn: () => createInternalTicket({ tipo, mensagem, attachments: upload.attachments }),
    onSuccess: () => {
      toast.success("Chamado enviado. A administração do sistema vai analisar.");
      setTipo("");
      setMensagem("");
      upload.reset();
      onCreated();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível enviar o chamado.");
    },
  });

  if (!user) return null;

  return (
    <div>
      <p className="mb-6 text-sm text-muted-foreground">
        Abra um chamado para a administração do sistema — melhorias, correção de bugs, inativação de usuário,
        revogar/atribuir licença, alterar número de licenças, etc.
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Enviado como</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Avatar name={user.name} src={user.avatarUrl} size="md" />
          <div>
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">
              {user.email} · {ROLE_LABEL[user.role]}
              {user.cargo ? ` · ${user.cargo}` : ""} · {user.setor}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Novo chamado</CardTitle>
          <CardDescription>Campos obrigatórios marcados com *</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (upload.isUploading) {
                toast.error("Aguarde o envio dos anexos terminar.");
                return;
              }
              mutation.mutate();
            }}
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="tipo">Tipo *</Label>
              <Input
                id="tipo"
                required
                placeholder="Ex: correção de bug, revogar licença, inativar usuário, melhoria..."
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mensagem">Mensagem *</Label>
              <Textarea
                id="mensagem"
                required
                rows={6}
                placeholder="Descreva o que você precisa..."
                value={mensagem}
                onChange={(e) => setMensagem(e.target.value)}
              />
            </div>

            <FileUploadField items={upload.items} onAddFiles={upload.addFiles} onRemove={upload.removeItem} />

            <Button type="submit" disabled={mutation.isPending || upload.isUploading} className="self-start">
              Enviar chamado
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function MeusChamadosTab() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["myInternalTickets"], queryFn: fetchMyInternalTickets });
  const tickets = data?.tickets ?? [];

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (tickets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Você ainda não abriu nenhum chamado.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tipo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Respostas</TableHead>
          <TableHead>Aberto em</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {tickets.map((t) => (
          <TableRow key={t.id}>
            <TableCell className="font-medium">{t.tipo}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{t._count?.interactions ?? 0}</TableCell>
            <TableCell className="text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
            <TableCell>
              <button
                onClick={() => navigate(`/suporte/${t.id}`)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver conversa
              </button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function SupportTicketPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = React.useState("novo");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Suporte</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="novo">Novo Chamado</TabsTrigger>
          <TabsTrigger value="meus">Meus Chamados</TabsTrigger>
        </TabsList>
        <TabsContent value="novo">
          <NovoChamadoTab
            onCreated={() => {
              queryClient.invalidateQueries({ queryKey: ["myInternalTickets"] });
              setTab("meus");
            }}
          />
        </TabsContent>
        <TabsContent value="meus">
          <MeusChamadosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
