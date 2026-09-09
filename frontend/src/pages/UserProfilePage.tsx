import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { fetchCompanyUserById } from "@/api/users";

const ROLE_LABEL: Record<string, string> = {
  USUARIO: "Usuário",
  COLABORADOR: "Colaborador Jurídico",
};

export function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["companyUser", id],
    queryFn: () => fetchCompanyUserById(id as string),
    enabled: Boolean(id),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  const profile = data?.user;
  if (!profile) return <p className="text-sm text-muted-foreground">Usuário não encontrado.</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="mb-6 flex items-center gap-4">
        <Avatar name={profile.name} src={profile.avatarUrl} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold">{profile.name}</h1>
          <p className="text-sm text-muted-foreground">{ROLE_LABEL[profile.role]}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">E-mail</p>
            <p className="font-medium">{profile.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Cargo</p>
            <p className="font-medium">{profile.cargo ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Setor</p>
            <p className="font-medium">{profile.setor}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Loja</p>
            <p className="font-medium">{profile.loja}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Cidade / Estado</p>
            <p className="font-medium">
              {profile.cidade} / {profile.estado}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
