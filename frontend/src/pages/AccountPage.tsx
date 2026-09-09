import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { updateMe } from "@/api/auth";
import { uploadFile } from "@/api/uploads";
import { ApiError } from "@/api/client";

export function AccountPage() {
  const { user, updateUser } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [name, setName] = React.useState(user?.name ?? "");
  const [setor, setSetor] = React.useState(user?.setor ?? "");
  const [cargo, setCargo] = React.useState(user?.cargo ?? "");
  const [email, setEmail] = React.useState(user?.email ?? "");
  const [avatarKey, setAvatarKey] = React.useState<string | null | undefined>(undefined);
  const [avatarPreview, setAvatarPreview] = React.useState<string | null>(user?.avatarUrl ?? null);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      updateMe({
        name,
        setor,
        cargo: cargo || null,
        email,
        ...(avatarKey !== undefined ? { avatarKey } : {}),
      }),
    onSuccess: ({ user: updated }) => {
      updateUser(updated);
      toast.success("Dados atualizados.");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    },
  });

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setIsUploadingAvatar(true);
    try {
      const result = await uploadFile(file);
      setAvatarKey(result.storageKey);
      setAvatarPreview(URL.createObjectURL(file));
    } catch {
      toast.error("Falha ao enviar a foto.");
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Minha Conta</h1>
      <Card>
        <CardHeader>
          <CardTitle>Dados pessoais</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className="flex flex-col gap-5"
          >
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="group relative rounded-full">
                <Avatar name={name || user.name} src={avatarPreview} size="lg" />
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-center text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {isUploadingAvatar ? "Enviando..." : "Alterar"}
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <p className="text-sm text-muted-foreground">Foto de perfil (opcional)</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="setor">Setor *</Label>
              <Input id="setor" required value={setor} onChange={(e) => setSetor(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cargo">Cargo</Label>
              <Input id="cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email corporativo *</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>

            <Button type="submit" disabled={mutation.isPending || isUploadingAvatar} className="self-start">
              Salvar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
