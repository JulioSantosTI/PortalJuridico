import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttachmentList } from "@/components/requests/AttachmentList";
import { Avatar } from "@/components/ui/avatar";
import { FileUploadField } from "@/components/requests/FileUploadField";
import { useFileUpload } from "@/hooks/useFileUpload";
import { fetchInternalTicketById, replyToInternalTicket } from "@/api/internalTickets";
import { ApiError } from "@/api/client";
import type { InternalTicketStatus } from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  USUARIO: "Usuário",
  COLABORADOR: "Colaborador Jurídico",
  GESTOR: "Gestor",
  ADMIN: "Administração do Sistema",
};

const STATUS_VARIANT: Record<InternalTicketStatus, "muted" | "success"> = {
  ABERTO: "muted",
  RESOLVIDO: "success",
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR");
}

export function SupportTicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const upload = useFileUpload();

  const { data, isLoading, error } = useQuery({
    queryKey: ["internalTicket", id],
    queryFn: () => fetchInternalTicketById(id as string),
    enabled: Boolean(id),
    retry: false,
  });

  const [message, setMessage] = React.useState("");

  const mutation = useMutation({
    mutationFn: () => replyToInternalTicket(id as string, { message, attachments: upload.attachments }),
    onSuccess: () => {
      toast.success("Resposta enviada.");
      setMessage("");
      upload.reset();
      queryClient.invalidateQueries({ queryKey: ["internalTicket", id] });
      queryClient.invalidateQueries({ queryKey: ["myInternalTickets"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível enviar a resposta.");
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (error) {
    const message = error instanceof ApiError ? error.message : "Não foi possível carregar o chamado.";
    return <p className="text-sm text-muted-foreground">{message}</p>;
  }
  const ticket = data?.ticket;
  if (!ticket) return <p className="text-sm text-muted-foreground">Chamado não encontrado.</p>;

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
          <h1 className="text-2xl font-semibold">{ticket.tipo}</h1>
          <p className="text-sm text-muted-foreground">Aberto em {formatDateTime(ticket.createdAt)}</p>
        </div>
        <Badge variant={STATUS_VARIANT[ticket.status]}>{ticket.status}</Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Mensagem original</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <p>{ticket.mensagem}</p>
          <div>
            <p className="mb-2 text-muted-foreground">Anexos</p>
            <AttachmentList attachments={ticket.attachments} />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Conversa</CardTitle>
        </CardHeader>
        <CardContent>
          {ticket.interactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há respostas.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {ticket.interactions.map((interaction) => (
                <li key={interaction.id} className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm">{interaction.message}</p>
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
                        <p className="text-xs text-muted-foreground">
                          {ROLE_LABEL[interaction.author.role] ?? interaction.author.role}
                          {interaction.author.cargo ? ` · ${interaction.author.cargo}` : ""}
                        </p>
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

      {ticket.status !== "RESOLVIDO" && (
        <Card>
          <CardHeader>
            <CardTitle>Responder</CardTitle>
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

              <FileUploadField items={upload.items} onAddFiles={upload.addFiles} onRemove={upload.removeItem} />

              <Button type="submit" disabled={mutation.isPending || upload.isUploading} className="self-start">
                Enviar resposta
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
