import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LoginPage } from "@/pages/LoginPage";
import { HomeRedirect } from "@/pages/HomeRedirect";
import { NewRequestPage } from "@/pages/NewRequestPage";
import { MyRequestsPage } from "@/pages/MyRequestsPage";
import { QueuePage } from "@/pages/QueuePage";
import { RequestDetailPage } from "@/pages/RequestDetailPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { DashboardPage } from "@/pages/DashboardPage";

function AuthenticatedLayout() {
  return (
    <ProtectedRoute>
      <AppShell />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<AuthenticatedLayout />}>
        <Route path="/" element={<HomeRedirect />} />
        <Route
          path="/solicitacoes/nova"
          element={
            <ProtectedRoute roles={["USUARIO"]}>
              <NewRequestPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/minhas-solicitacoes"
          element={
            <ProtectedRoute roles={["USUARIO"]}>
              <MyRequestsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/fila"
          element={
            <ProtectedRoute roles={["COLABORADOR", "GESTOR"]}>
              <QueuePage />
            </ProtectedRoute>
          }
        />
        <Route path="/solicitacoes/:id" element={<RequestDetailPage />} />
        <Route
          path="/historico"
          element={
            <ProtectedRoute roles={["COLABORADOR", "GESTOR"]}>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={["GESTOR"]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
