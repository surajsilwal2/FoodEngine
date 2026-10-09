"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  api,
  driverRefreshTokenKey,
  driverTokenKey,
  driverUserKey,
  getApiErrorMessage,
} from "@/lib/api";
import type { DriverUser } from "@/lib/queries";

interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: DriverUser;
}

/**
 * Owns this browser's driver session: restoring it after a refresh, keeping it
 * in step with token rotation, signing in and signing out.
 */
export function useDriverSession() {
  const queryClient = useQueryClient();
  const [isReady, setIsReady] = useState(false);
  const [token, setToken] = useState("");
  const [user, setUser] = useState<DriverUser | null>(null);
  const [loginError, setLoginError] = useState("");

  // Restore the isolated driver session only after the browser can read storage.
  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const savedToken = localStorage.getItem(driverTokenKey);
      const savedUser = localStorage.getItem(driverUserKey);
      if (savedToken && savedUser) {
        try {
          setToken(savedToken);
          setUser(JSON.parse(savedUser) as DriverUser);
        } catch {
          localStorage.removeItem(driverTokenKey);
          localStorage.removeItem(driverUserKey);
        }
      }
      setIsReady(true);
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  // A rotated token must reach both the HTTP client and the private socket; an
  // expired session clears every cached driver resource.
  useEffect(() => {
    const onTokenRefreshed = (event: Event) => {
      const nextToken = (event as CustomEvent<{ accessToken?: string }>).detail
        ?.accessToken;
      if (nextToken) setToken(nextToken);
    };
    const onSessionExpired = () => {
      setToken("");
      setUser(null);
      queryClient.clear();
    };

    window.addEventListener("driver:token-refreshed", onTokenRefreshed);
    window.addEventListener("driver:session-expired", onSessionExpired);
    return () => {
      window.removeEventListener("driver:token-refreshed", onTokenRefreshed);
      window.removeEventListener("driver:session-expired", onSessionExpired);
    };
  }, [queryClient]);

  const loginMutation = useMutation({
    mutationFn: async (values: { email: string; password: string }) =>
      (await api.post("/auth/login", values)).data as LoginResponse,
    onSuccess: (data) => {
      localStorage.setItem(driverTokenKey, data.accessToken);
      // This driver's own refresh token: rotation must never fall back to the
      // host-wide cookie, which other accounts on this machine also overwrite.
      if (data.refreshToken) {
        localStorage.setItem(driverRefreshTokenKey, data.refreshToken);
      }
      localStorage.setItem(driverUserKey, JSON.stringify(data.user));
      // Drop the previous driver's cached profile and active delivery.
      queryClient.clear();
      setToken(data.accessToken);
      setUser(data.user);
      setLoginError("");
    },
    onError: (error: unknown) => setLoginError(getApiErrorMessage(error)),
  });

  const signOut = async () => {
    // Revoke this driver's refresh-token family before clearing the session.
    await api
      .post("/auth/logout", {
        refreshToken: localStorage.getItem(driverRefreshTokenKey) || undefined,
      })
      .catch(() => undefined);

    localStorage.removeItem(driverTokenKey);
    localStorage.removeItem(driverRefreshTokenKey);
    localStorage.removeItem(driverUserKey);
    queryClient.clear();
    setToken("");
    setUser(null);
  };

  return { isReady, token, user, loginError, loginMutation, signOut };
}
