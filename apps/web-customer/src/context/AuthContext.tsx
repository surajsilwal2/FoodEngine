"use client";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import React, {
  createContext,
  useReducer,
  useContext,
  useEffect,
  useEffectEvent,
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
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
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
  const router = useRouter();

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
  });

  const expireSession = useEffectEvent(() => {
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

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("accessToken", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    dispatch({ type: "session-restored", user: newUser, token: newToken });
    connectSocket();
  };

  const logout = async () => {
    // Revoke the refresh-token family before clearing the local session.
    await api.post("/auth/logout").catch(() => null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    dispatch({ type: "session-cleared" });
    disconnectSocket();
  };
  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isAuthenticated: !!token }}
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
