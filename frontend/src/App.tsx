import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/layout/AdminProtectedRoute";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import { AdminLoginPage } from "@/pages/admin/AdminLoginPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminTicketDetailPage } from "@/pages/admin/AdminTicketDetailPage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { HomeRedirect } from "@/pages/HomeRedirect";
import { NewRequestPage } from "@/pages/NewRequestPage";
import { MyRequestsPage } from "@/pages/MyRequestsPage";
import { QueuePage } from "@/pages/QueuePage";
import { RequestDetailPage } from "@/pages/RequestDetailPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { AgendaPage } from "@/pages/AgendaPage";
import { UserManagementPage } from "@/pages/UserManagementPage";
import { AccountPage } from "@/pages/AccountPage";
import { UserProfilePage } from "@/pages/UserProfilePage";
import { SupportTicketPage } from "@/pages/SupportTicketPage";
import { SupportTicketDetailPage } from "@/pages/SupportTicketDetailPage";
import { SystemPreferencesPage } from "@/pages/SystemPreferencesPage";

function AuthenticatedLayout() {
  return (
    <ProtectedRoute>
      <AppShell />
    </ProtectedRoute>
  );
}

// Área isolada do dono da plataforma: contexto de auth próprio, montado só
// quando alguém navega pra /admin — nunca interfere na árvore de rotas da empresa.
function AdminArea() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<AdminLoginPage />} />
        <Route
          index
          element={
            <AdminProtectedRoute>
              <AdminDashboardPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="chamados/:id"
          element={
            <AdminProtectedRoute>
              <AdminTicketDetailPage />
            </AdminProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminAuthProvider>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminArea />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<SignupPage />} />

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
          path="/agenda"
          element={
            <ProtectedRoute roles={["COLABORADOR", "GESTOR"]}>
              <AgendaPage />
            </ProtectedRoute>
          }
        />
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
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute roles={["GESTOR"]}>
              <UserManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/usuarios/:id"
          element={
            <ProtectedRoute roles={["GESTOR"]}>
              <UserProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/suporte"
          element={
            <ProtectedRoute roles={["COLABORADOR", "GESTOR"]}>
              <SupportTicketPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/suporte/:id"
          element={
            <ProtectedRoute roles={["COLABORADOR", "GESTOR"]}>
              <SupportTicketDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/preferencias"
          element={
            <ProtectedRoute roles={["GESTOR"]}>
              <SystemPreferencesPage />
            </ProtectedRoute>
          }
        />
        <Route path="/conta" element={<AccountPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
