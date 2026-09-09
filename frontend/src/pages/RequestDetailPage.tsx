import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/requests/StatusBadge";
import { DeadlineBadge } from "@/components/requests/DeadlineBadge";
import { AttachmentList } from "@/components/requests/AttachmentList";
import { Avatar } from "@/components/ui/avatar";
import { FileUploadField } from "@/components/requests/FileUploadField";
import { useFileUpload } from "@/hooks/useFileUpload";
import { useAuth } from "@/context/AuthContext";
import { fetchRequestById } from "@/api/requests";
import { createInteraction } from "@/api/interactions";
import { ApiError } from "@/api/client";
import type { RequestStatus } from "@/lib/types";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const upload = useFileUpload();

  const { data, isLoading } = useQuery({
    queryKey: ["request", id],
    queryFn: () => fetchRequestById(id as string),
    enabled: Boolean(id),
  });

  const [message, setMessage] = React.useState("");
  const [newStatus, setNewStatus] = React.useState<RequestStatus | "">("");

  const mutation = useMutation({
    mutationFn: () =>
      createInteraction(id as string, {
        message,
        statusChangeTo: newStatus || undefined,
        attachments: upload.attachments,
      }),
    onSuccess: () => {
      toast.success("Tratativa registrada.");
      setMessage("");
      setNewStatus("");
      upload.reset();
      queryClient.invalidateQueries({ queryKey: ["request", id] });
      queryClient.invalidateQueries({ queryKey: ["queue"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível registrar a tratativa.");
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  const request = data?.request;
  if (!request) return <p className="text-sm text-muted-foreground">Solicitação não encontrada.</p>;

  const canTreat =
    request.status !== "FINALIZADO" &&
    user &&
    (user.role === "GESTOR" || (user.role === "COLABORADOR" && request.assignedTo?.id === user.id));

  return (
    <div className="mx-auto max-w-3xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{request.requestType.name}</h1>
          <p className="text-sm text-muted-foreground">Aberta em {formatDateTime(request.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={request.status} />
          <DeadlineBadge diasUteisRestantes={request.diasUteisRestantes} atrasado={request.atrasado} status={request.status} />
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Dados da solicitação</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Solicitante</p>
            <p className="font-medium">{request.requester.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Setor / Loja</p>
            <p className="font-medium">
              {request.requesterSetor} / {request.requesterLoja}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Responsável</p>
            <p className="font-medium">{request.assignedTo?.name ?? "Não atribuído"}</p>
          </div>
          {request.advertidoNome && (
            <div>
              <p className="text-muted-foreground">Pessoa advertida</p>
              <p className="font-medium">{request.advertidoNome}</p>
            </div>
          )}
          {request.motivo && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Motivo</p>
              <p className="font-medium">{request.motivo}</p>
            </div>
          )}
          {request.descricaoRevisao && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Descrição da revisão</p>
              <p className="font-medium">{request.descricaoRevisao}</p>
            </div>
          )}
          {request.detalhes?.descricao && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Descrição</p>
              <p className="font-medium">{request.detalhes.descricao}</p>
            </div>
          )}
          <div className="col-span-2">
            <p className="mb-2 text-muted-foreground">Anexos da solicitação</p>
            <AttachmentList attachments={request.attachments} />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Tratativas</CardTitle>
        </CardHeader>
        <CardContent>
          {request.interactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há respostas do jurídico.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {request.interactions.map((interaction) => (
                <li key={interaction.id} className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm">{interaction.message}</p>
                  {interaction.statusChangeTo && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Status alterado para: <StatusBadge status={interaction.statusChangeTo} />
                    </p>
                  )}
                  {interaction.attachments.length > 0 && (
                    <div className="mt-3">
                      <AttachmentList attachments={interaction.attachments} />
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={interaction.author.name} src={interaction.author.avatarUrl} size="sm" />
                      <div className="leading-tight">
                        <p className="text-xs font-medium">{interaction.author.name}</p>
                        {interaction.author.cargo && (
                          <p className="text-xs text-muted-foreground">{interaction.author.cargo}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDateTime(interaction.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canTreat && (
        <Card>
          <CardHeader>
            <CardTitle>Registrar tratativa</CardTitle>
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
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="message">Resposta *</Label>
                <Textarea id="message" required value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>

              <FileUploadField items={upload.items} onAddFiles={upload.addFiles} onRemove={upload.removeItem} label="Anexar documento (PDF, Word...)" />

              <div className="flex flex-col gap-1.5">
                <Label>Alterar status</Label>
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as RequestStatus)}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Manter status atual" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ABERTO">Aberto</SelectItem>
                    <SelectItem value="EM_ANDAMENTO">Em andamento</SelectItem>
                    <SelectItem value="FINALIZADO">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" disabled={mutation.isPending || upload.isUploading} className="self-start">
                Enviar tratativa
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
