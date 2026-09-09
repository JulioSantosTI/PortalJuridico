import * as React from "react";
import { adminLogin, fetchAdminMe } from "@/api/admin";
import type { PlatformAdmin } from "@/api/admin";
import { clearAdminToken, getAdminToken, setAdminToken } from "@/api/adminClient";

interface AdminAuthContextValue {
  admin: PlatformAdmin | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<PlatformAdmin>;
  logout: () => void;
}

const AdminAuthContext = React.createContext<AdminAuthContextValue | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = React.useState<PlatformAdmin | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchAdminMe()
      .then(({ admin }) => setAdmin(admin))
      .catch(() => clearAdminToken())
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    function handleUnauthorized() {
      setAdmin(null);
    }
    window.addEventListener("admin-auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("admin-auth:unauthorized", handleUnauthorized);
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    const { token, admin } = await adminLogin(email, password);
    setAdminToken(token);
    setAdmin(admin);
    return admin;
  }, []);

  const logout = React.useCallback(() => {
    clearAdminToken();
    setAdmin(null);
  }, []);

  return <AdminAuthContext.Provider value={{ admin, isLoading, login, logout }}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = React.useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth deve ser usado dentro de um AdminAuthProvider");
  return ctx;
}
