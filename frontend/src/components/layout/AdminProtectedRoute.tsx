import { Navigate } from "react-router-dom";
import { useAdminAuth } from "@/context/AdminAuthContext";

export function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  const { admin, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Carregando...</div>
    );
  }
  if (!admin) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
}
