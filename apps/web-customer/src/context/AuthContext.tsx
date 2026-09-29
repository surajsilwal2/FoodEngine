"use client";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { api } from "@/lib/api";
import React, {
  createContext,
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
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Read persisted browser state after mount to keep server rendering storage-free.
  const restoreSession = useEffectEvent(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("accessToken");

    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        connectSocket();
      } catch {
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");
      }
    }
  });

  const expireSession = useEffectEvent(() => {
    setUser(null);
    setToken(null);
    disconnectSocket();
  });

  useEffect(() => {
    const handleExpiredSession = () => expireSession();
    // Deferring hydration avoids a synchronous state update inside the effect.
    const restoreTimer = window.setTimeout(restoreSession, 0);
    window.addEventListener("auth:expired", handleExpiredSession);
    return () => {
      window.clearTimeout(restoreTimer);
      window.removeEventListener("auth:expired", handleExpiredSession);
      disconnectSocket();
    };
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("accessToken", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    connectSocket();
  };

  const logout = async () => {
    // Revoke the refresh-token family before clearing the local session.
    await api.post("/auth/logout").catch(() => null);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
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
