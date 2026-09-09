import * as React from "react";
import { fetchMe, login as loginRequest } from "@/api/auth";
import { clearToken, getToken, setToken } from "@/api/client";
import type { User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchMe()
      .then(({ user }) => setUser(user))
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, []);

  React.useEffect(() => {
    function handleUnauthorized() {
      setUser(null);
    }
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  const login = React.useCallback(async (email: string, password: string) => {
    const { token, user } = await loginRequest(email, password);
    setToken(token);
    setUser(user);
    return user;
  }, []);

  const logout = React.useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const updateUser = React.useCallback((updated: User) => {
    setUser(updated);
  }, []);

  return <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  return ctx;
}
