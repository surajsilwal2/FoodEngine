"use client";

import { api } from "@/lib/api";
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
  setSession: (accessToken: string, user: MerchantUser) => void;
  logout: () => Promise<void>;
}

const ACCESS_TOKEN_KEY = "merchantAccessToken";
const USER_KEY = "merchantUser";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MerchantUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  const queryClient = useQueryClient();

  const clearStoredSession = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  useEffect(() => {
    // Read the saved session after mount so server rendering stays storage-free.
    const restoreTimer = window.setTimeout(() => {
      try {
        const savedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        const savedUser = localStorage.getItem(USER_KEY);

        // Both halves are required. A token without a user (or the reverse) is
        // a half-written session, so drop it instead of sending requests with a
        // token we cannot attribute.
        if (savedToken && savedUser) {
          setUser(JSON.parse(savedUser) as MerchantUser);
        } else if (savedToken || savedUser) {
          clearStoredSession();
        }
      } catch {
        // A corrupt value (or blocked storage) must not trap the app.
        clearStoredSession();
      } finally {
        setIsReady(true);
      }
    }, 0);

    // The API layer fires this when a token refresh fails: drop the session and
    // remember where the merchant was so sign-in can return them there.
    const onSessionExpired = () => {
      setUser(null);
      const returnTo = `${window.location.pathname}${window.location.search}`;
      const next =
        returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/";
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    };

    window.addEventListener("merchant:session-expired", onSessionExpired);
    return () => {
      window.clearTimeout(restoreTimer);
      window.removeEventListener("merchant:session-expired", onSessionExpired);
    };
  }, [router, clearStoredSession]);

  const setSession = useCallback(
    (accessToken: string, nextUser: MerchantUser) => {
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
    },
    [],
  );

  const logout = useCallback(async () => {
    // Revoke the refresh-token family first, then drop the local session.
    await api.post("/auth/logout", {}).catch(() => undefined);
    clearStoredSession();
    setUser(null);
    queryClient.clear();
    router.replace("/login");
  }, [clearStoredSession, router]);

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
