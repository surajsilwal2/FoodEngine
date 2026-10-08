"use client";

import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY, api } from "@/lib/api";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

export interface AdminUser {
  id: number;
  email: string;
  name: string;
  userRole: string;
}

interface AuthContextValue {
  user: AdminUser | null;
  isReady: boolean;
  isAuthenticated: boolean;
  setSession: (accessToken: string, user: AdminUser, refreshToken?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const savedUser = localStorage.getItem(USER_KEY);
      const savedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      return savedToken && savedUser ? (JSON.parse(savedUser) as AdminUser) : null;
    } catch {
      return null;
    }
  });
  const [isReady, setIsReady] = useState(() => typeof window !== "undefined");
  const router = useRouter();
  const queryClient = useQueryClient();

  const clearStoredSession = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  useEffect(() => {
    // If not hydrated yet (e.g. initial SSR hydration pass), sync from localStorage immediately
    if (!isReady) {
      try {
        const savedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        const savedUser = localStorage.getItem(USER_KEY);
        if (savedToken && savedUser) {
          setUser(JSON.parse(savedUser) as AdminUser);
        } else if (savedToken || savedUser) {
          clearStoredSession();
        }
      } catch {
        clearStoredSession();
      } finally {
        setIsReady(true);
      }
    }

    const onSessionExpired = () => {
      clearStoredSession();
      setUser(null);
      const returnTo = `${window.location.pathname}${window.location.search}`;
      const next =
        returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    };

    window.addEventListener("admin:session-expired", onSessionExpired);
    return () => {
      window.removeEventListener("admin:session-expired", onSessionExpired);
    };
  }, [router, clearStoredSession, isReady]);

  const setSession = useCallback(
    (accessToken: string, nextUser: AdminUser, refreshToken?: string) => {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
      setIsReady(true);
    },
    [],
  );

  const logout = useCallback(async () => {
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    await api
      .post("/auth/logout", { refreshToken: storedRefreshToken || undefined })
      .catch(() => undefined);
    clearStoredSession();
    setUser(null);
    queryClient.clear();
    router.replace("/login");
  }, [clearStoredSession, queryClient, router]);

  return (
    <AuthContext.Provider
      value={{ user, isReady, isAuthenticated: !!user, setSession, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}