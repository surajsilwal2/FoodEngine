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

export interface MerchantUser {
  id: number;
  email: string;
  name: string;
}

interface AuthContextValue {
  user: MerchantUser | null;
  /** True once the saved session has been read from storage. */
  isReady: boolean;
  isAuthenticated: boolean;
  setSession: (accessToken: string, user: MerchantUser, refreshToken?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MerchantUser | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const savedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);
      return savedToken && savedUser ? (JSON.parse(savedUser) as MerchantUser) : null;
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
    // If running on server or isReady already true from synchronous init, nothing to do.
    if (isReady) {
      // No-op – state was initialised synchronously from localStorage above.
    }

    const onSessionExpired = () => {
      clearStoredSession();
      setUser(null);
      const returnTo = `${window.location.pathname}${window.location.search}`;
      const next =
        returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    };

    window.addEventListener("merchant:session-expired", onSessionExpired);
    return () => {
      window.removeEventListener("merchant:session-expired", onSessionExpired);
    };
  }, [router, clearStoredSession, isReady]);

  const setSession = useCallback(
    (accessToken: string, nextUser: MerchantUser, refreshToken?: string) => {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      }
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
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
