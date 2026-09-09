import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createRequestType, fetchRequestTypes, updateRequestTypeSla } from "@/api/requestTypes";
import { ApiError } from "@/api/client";
import type { RequestType } from "@/lib/types";

function RequestTypeSlaCard({ id, name, slaBusinessDays }: RequestType) {
  const queryClient = useQueryClient();
  const [value, setValue] = React.useState(String(slaBusinessDays));

  React.useEffect(() => setValue(String(slaBusinessDays)), [slaBusinessDays]);

  const mutation = useMutation({
    mutationFn: (n: number) => updateRequestTypeSla(id, n),
    onSuccess: () => {
      toast.success("Prazo atualizado.");
      queryClient.invalidateQueries({ queryKey: ["requestTypes"] });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar.");
      setValue(String(slaBusinessDays));
    },
  });

  const dirty = value !== String(slaBusinessDays);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{name}</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Label htmlFor={`sla-${id}`} className="sr-only">
          Prazo em dias úteis — {name}
        </Label>
        <Input
          id={`sla-${id}`}
          type="number"
          min={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-24"
        />
        <span className="text-sm text-muted-foreground">dias úteis</span>
        <Button
          size="sm"
          className="ml-auto"
          disabled={!dirty || mutation.isPending}
          onClick={() => mutation.mutate(Number(value))}
        >
          Salvar
        </Button>
      </CardContent>
    </Card>
  );
}

function DeterminarPrazosTab() {
  const { data, isLoading } = useQuery({ queryKey: ["requestTypes"], queryFn: fetchRequestTypes });
  const requestTypes = data?.requestTypes ?? [];

  return (
    <div>
      <p className="mb-6 text-sm text-muted-foreground">
        Defina o prazo (em dias úteis) de retorno para cada tipo de solicitação. Esse prazo é o que aparece pro
        usuário ao abrir uma nova solicitação.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="flex flex-col gap-4">
          {requestTypes.map((type) => (
            <RequestTypeSlaCard key={type.id} {...type} />
          ))}
        </div>
      )}
    </div>
  );
}

function CadastrarTipoTab({ onCreated }: { onCreated: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = React.useState("");
  const [slaBusinessDays, setSlaBusinessDays] = React.useState("");

  const mutation = useMutation({
    mutationFn: () => createRequestType({ name, slaBusinessDays: Number(slaBusinessDays) }),
    onSuccess: () => {
      toast.success("Tipo de solicitação cadastrado.");
      queryClient.invalidateQueries({ queryKey: ["requestTypes"] });
      setName("");
      setSlaBusinessDays("");
      onCreated();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível cadastrar.");
    },
  });

  return (
    <div>
      <p className="mb-6 text-sm text-muted-foreground">
        Cadastre um novo tipo de solicitação. Depois de criado, ele já aparece na aba "Determinar Prazos" caso queira
        ajustar o prazo mais tarde.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Novo tipo de solicitação</CardTitle>
          <CardDescription>Campos obrigatórios marcados com *</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className="flex flex-col gap-5"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type-name">Nome *</Label>
              <Input id="type-name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="type-sla">Prazo (dias úteis) *</Label>
              <Input
                id="type-sla"
                type="number"
                min={1}
                required
                className="w-24"
                value={slaBusinessDays}
                onChange={(e) => setSlaBusinessDays(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={mutation.isPending} className="self-start">
              Cadastrar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export function SystemPreferencesPage() {
  const [tab, setTab] = React.useState("prazos");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Preferências do Sistema</h1>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="prazos">Determinar Prazos</TabsTrigger>
          <TabsTrigger value="cadastrar">Cadastrar Tipo de Solicitação</TabsTrigger>
        </TabsList>
        <TabsContent value="prazos">
          <DeterminarPrazosTab />
        </TabsContent>
        <TabsContent value="cadastrar">
          <CadastrarTipoTab onCreated={() => setTab("prazos")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
