"use client";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { REFRESH_TOKEN_KEY, api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import React, {
  createContext,
  useReducer,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
} from "react";

interface User {
  id: number;
  email: string;
  name: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User, refreshToken?: string) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  /**
   * True once the persisted session has been read from localStorage. Pages can
   * gate on this so they don't flash their signed-out state on first paint.
   */
  isReady: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
}

type AuthAction =
  | { type: "session-restored"; user: User; token: string }
  | { type: "session-cleared" };

const INITIAL_AUTH_STATE: AuthState = { user: null, token: null };

// Return a fresh state object for each action so auth state stays immutable.
function authReducer(_state: AuthState, action: AuthAction): AuthState {
  if (action.type === "session-restored") {
    return { user: { ...action.user }, token: action.token };
  }

  return { ...INITIAL_AUTH_STATE };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ user, token }, dispatch] = useReducer(authReducer, INITIAL_AUTH_STATE);
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Read persisted browser state after mount to keep server rendering storage-free.
  const restoreSession = useEffectEvent(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("accessToken");

    if (storedToken && storedUser) {
      try {
        dispatch({
          type: "session-restored",
          user: JSON.parse(storedUser) as User,
          token: storedToken,
        });
        connectSocket();
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
      }
    }

    // FLASH FIX: mark hydration complete (even when there is no session) so
    // consumers stop rendering their signed-out branch before storage is read.
    setIsReady(true);
  });

  const expireSession = useEffectEvent(() => {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    // Drop cached orders so a later sign-in cannot show the previous account's.
    queryClient.clear();
    dispatch({ type: "session-cleared" });
    disconnectSocket();
  });

  useEffect(() => {
    const handleExpiredSession = (event: Event) => {
      expireSession();
      const returnTo = (event as CustomEvent<{ returnTo?: string }>).detail
        ?.returnTo;
      const nextPath = returnTo?.startsWith("/") && !returnTo.startsWith("//")
        ? returnTo
        : "/restaurants";
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
    };
    // Deferring hydration avoids a synchronous state update inside the effect.
    const restoreTimer = window.setTimeout(restoreSession, 0);
    window.addEventListener("auth:expired", handleExpiredSession);
    return () => {
      window.clearTimeout(restoreTimer);
      window.removeEventListener("auth:expired", handleExpiredSession);
      disconnectSocket();
    };
  }, [router]);

  const login = (newToken: string, newUser: User, newRefreshToken?: string) => {
    localStorage.setItem("accessToken", newToken);
    // Keep this workspace's own refresh token, so token rotation never depends
    // on the host-wide cookie shared with the merchant and driver apps.
    if (newRefreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
    }
    localStorage.setItem("user", JSON.stringify(newUser));
    // Never let a new account read the previous account's cached data.
    queryClient.clear();
    dispatch({ type: "session-restored", user: newUser, token: newToken });
    connectSocket();
  };

  const logout = async () => {
    // Revoke the refresh-token family before clearing the local session.
    await api
      .post("/auth/logout", {
        refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) || undefined,
      })
      .catch(() => null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    queryClient.clear();
    dispatch({ type: "session-cleared" });
    disconnectSocket();
  };
  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isAuthenticated: !!token, isReady }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
