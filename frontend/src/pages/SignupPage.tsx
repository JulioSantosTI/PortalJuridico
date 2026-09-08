import * as React from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, Scale } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { submitAccessRequest } from "@/api/accessRequests";
import { ApiError } from "@/api/client";
import type { RequestableRole } from "@/lib/types";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const initialForm = {
  name: "",
  email: "",
  password: "",
  loja: "",
  setor: "",
  cidade: "",
  estado: "",
  requestedRole: "" as RequestableRole | "",
};

export function SignupPage() {
  const [form, setForm] = React.useState(initialForm);
  const [submitted, setSubmitted] = React.useState(false);

  const mutation = useMutation({
    mutationFn: submitAccessRequest,
    onSuccess: () => setSubmitted(true),
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível enviar a solicitação.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.requestedRole || !form.estado) {
      toast.error("Preencha estado e o tipo de acesso.");
      return;
    }
    mutation.mutate({ ...form, requestedRole: form.requestedRole });
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <CheckCircle2 className="h-6 w-6 text-success" />
            </div>
            <CardTitle>Solicitação enviada</CardTitle>
            <CardDescription>
              Aguarde a aprovação do gestor. Assim que sua conta for liberada, você poderá entrar com o e-mail e a
              senha que acabou de cadastrar.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button asChild variant="outline">
              <Link to="/login">Voltar ao login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <Scale className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Solicitar acesso</CardTitle>
          <CardDescription>Preencha seus dados. Um gestor precisa aprovar antes de você conseguir entrar.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nome completo *</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail corporativo *</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="loja">Loja *</Label>
                <Input id="loja" required value={form.loja} onChange={(e) => setForm((f) => ({ ...f, loja: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="setor">Setor *</Label>
                <Input id="setor" required value={form.setor} onChange={(e) => setForm((f) => ({ ...f, setor: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cidade">Cidade *</Label>
                <Input
                  id="cidade"
                  required
                  value={form.cidade}
                  onChange={(e) => setForm((f) => ({ ...f, cidade: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Estado *</Label>
                <Select value={form.estado} onValueChange={(v) => setForm((f) => ({ ...f, estado: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="UF" />
                  </SelectTrigger>
                  <SelectContent>
                    {UFS.map((uf) => (
                      <SelectItem key={uf} value={uf}>
                        {uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tipo de acesso *</Label>
              <Select
                value={form.requestedRole}
                onValueChange={(v) => setForm((f) => ({ ...f, requestedRole: v as RequestableRole }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USUARIO">Usuário (abre solicitações)</SelectItem>
                  <SelectItem value="COLABORADOR">Colaborador Jurídico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={mutation.isPending} className="mt-2">
              Enviar solicitação
            </Button>
            <Link to="/login" className="text-center text-sm text-muted-foreground hover:text-foreground">
              Já tem acesso? Entrar
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
