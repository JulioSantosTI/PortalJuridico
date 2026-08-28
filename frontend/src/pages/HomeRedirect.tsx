import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === "USUARIO") return <Navigate to="/minhas-solicitacoes" replace />;
  if (user.role === "GESTOR") return <Navigate to="/fila" replace />;
  return <Navigate to="/fila" replace />;
}
