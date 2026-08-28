import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadField } from "@/components/requests/FileUploadField";
import { useFileUpload } from "@/hooks/useFileUpload";
import { fetchRequestTypes } from "@/api/requestTypes";
import { createRequest } from "@/api/requests";
import { ApiError } from "@/api/client";

export function NewRequestPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const upload = useFileUpload();

  const { data, isLoading } = useQuery({ queryKey: ["requestTypes"], queryFn: fetchRequestTypes });
  const requestTypes = data?.requestTypes ?? [];

  const [slug, setSlug] = React.useState<string>("");
  const [requesterSetor, setRequesterSetor] = React.useState("");
  const [requesterLoja, setRequesterLoja] = React.useState("");
  const [advertidoNome, setAdvertidoNome] = React.useState("");
  const [motivo, setMotivo] = React.useState("");
  const [descricaoRevisao, setDescricaoRevisao] = React.useState("");

  const selectedType = requestTypes.find((t) => t.slug === slug);

  const mutation = useMutation({
    mutationFn: createRequest,
    onSuccess: () => {
      toast.success("Solicitação enviada com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["myRequests"] });
      navigate("/minhas-solicitacoes");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível enviar a solicitação.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) {
      toast.error("Selecione o motivo da solicitação.");
      return;
    }
    if (upload.isUploading) {
      toast.error("Aguarde o envio dos anexos terminar.");
      return;
    }
    mutation.mutate({
      requestTypeSlug: slug,
      requesterSetor,
      requesterLoja,
      advertidoNome: slug === "advertencia" ? advertidoNome : undefined,
      motivo: slug === "advertencia" ? motivo : undefined,
      descricaoRevisao: slug === "revisao_contrato" ? descricaoRevisao : undefined,
      attachments: upload.attachments,
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold">Nova Solicitação</h1>
      <p className="mb-6 text-sm text-muted-foreground">Preencha os dados abaixo para abrir uma solicitação para o jurídico.</p>

      <Card>
        <CardHeader>
          <CardTitle>Dados da solicitação</CardTitle>
          <CardDescription>Campos obrigatórios marcados com *</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <Label>Motivo da solicitação *</Label>
              <Select value={slug} onValueChange={setSlug} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o motivo" />
                </SelectTrigger>
                <SelectContent>
                  {requestTypes.map((type) => (
                    <SelectItem key={type.id} value={type.slug}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedType && (
                <p className="text-xs text-muted-foreground">
                  Prazo estimado de resposta: {selectedType.slaBusinessDays} dias úteis.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="setor">Setor do solicitante *</Label>
                <Input id="setor" required value={requesterSetor} onChange={(e) => setRequesterSetor(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="loja">Loja / unidade *</Label>
                <Input id="loja" required value={requesterLoja} onChange={(e) => setRequesterLoja(e.target.value)} />
              </div>
            </div>

            {slug === "advertencia" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="advertido">Nome de quem será advertido *</Label>
                  <Input id="advertido" required value={advertidoNome} onChange={(e) => setAdvertidoNome(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="motivo">Motivo *</Label>
                  <Textarea id="motivo" required value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                </div>
              </>
            )}

            {slug === "revisao_contrato" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="descricao">Descrição do que precisa ser revisado *</Label>
                <Textarea
                  id="descricao"
                  required
                  value={descricaoRevisao}
                  onChange={(e) => setDescricaoRevisao(e.target.value)}
                />
              </div>
            )}

            <FileUploadField items={upload.items} onAddFiles={upload.addFiles} onRemove={upload.removeItem} />

            <Button type="submit" disabled={mutation.isPending || upload.isUploading || !slug} className="mt-2 self-start">
              Enviar solicitação
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
