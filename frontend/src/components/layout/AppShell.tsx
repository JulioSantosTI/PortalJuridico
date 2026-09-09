import { NavLink, Outlet } from "react-router-dom";
import { Scale, FilePlus2, ListChecks, ClipboardList, History, LayoutDashboard, LogOut, CalendarDays, Users, UserCircle, LifeBuoy, SlidersHorizontal } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useBrowserReminders } from "@/hooks/useBrowserReminders";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";

const ROLE_LABEL: Record<string, string> = {
  USUARIO: "Usuário",
  COLABORADOR: "Colaborador Jurídico",
  GESTOR: "Gestor",
};

export function AppShell() {
  const { user, logout } = useAuth();
  useBrowserReminders(user?.role === "COLABORADOR" || user?.role === "GESTOR");
  if (!user) return null;

  const links = [
    user.role === "USUARIO" && { to: "/minhas-solicitacoes", label: "Minhas Solicitações", icon: ClipboardList },
    user.role === "USUARIO" && { to: "/solicitacoes/nova", label: "Nova Solicitação", icon: FilePlus2 },
    (user.role === "COLABORADOR" || user.role === "GESTOR") && { to: "/fila", label: "Fila Geral", icon: ListChecks },
    (user.role === "COLABORADOR" || user.role === "GESTOR") && { to: "/agenda", label: "Agenda", icon: CalendarDays },
    (user.role === "COLABORADOR" || user.role === "GESTOR") && { to: "/historico", label: "Histórico", icon: History },
    user.role === "GESTOR" && { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    user.role === "GESTOR" && { to: "/usuarios", label: "Gerenciamento de Usuários", icon: Users },
    user.role === "GESTOR" && { to: "/preferencias", label: "Preferências do Sistema", icon: SlidersHorizontal },
    (user.role === "COLABORADOR" || user.role === "GESTOR") && { to: "/suporte", label: "Suporte", icon: LifeBuoy },
    { to: "/conta", label: "Minha Conta", icon: UserCircle },
  ].filter((link): link is { to: string; label: string; icon: typeof FilePlus2 } => Boolean(link));

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border px-6 py-5">
          <Scale className="h-6 w-6 text-primary" />
          <span className="text-base font-semibold">Portal Jurídico</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-3">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                  isActive && "bg-secondary text-secondary-foreground"
                )
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3">
            <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {ROLE_LABEL[user.role]} · {user.setor}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
