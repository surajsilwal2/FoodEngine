"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: number;
    email: string;
    name: string;
    role?: string;
  };
}

export function useLogin() {
  const { login } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ email, password }: LoginPayload) => {
      const { data } = await api.post<AuthResponse>("/auth/login", {
        email,
        password,
      });
      return data;
    },
    onSuccess: (data) => {
      login(data.accessToken, data.user);

      const nextPath = new URLSearchParams(window.location.search).get("next");
      const returnPath =
        nextPath?.startsWith("/") && !nextPath.startsWith("//")
          ? nextPath
          : "/restaurants";

      router.replace(returnPath);
    },
  });
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export function useRegister() {
  const { login } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: async ({ name, email, password }: RegisterPayload) => {
      const { data } = await api.post<AuthResponse>("/auth/register", {
        name,
        email,
        password,
      });
      return data;
    },
    onSuccess: (data) => {
      login(data.accessToken, data.user, data.refreshToken);
      router.replace("/restaurants");
    },
  });
}

/**
 * Keeps an already-signed-in visitor away from the auth screens by sending them
 * back to the app. Returns true while the redirect is in flight so the page can
 * render a placeholder instead of flashing its form to a signed-in user.
 */
export function useRedirectIfAuthenticated() {
  const { isAuthenticated, isReady } = useAuth();
  const router = useRouter();
  const shouldRedirect = isReady && isAuthenticated;

  useEffect(() => {
    if (!shouldRedirect) return;

    // Honour a safe ?next= target (single leading slash), else go to the app.
    const nextPath = new URLSearchParams(window.location.search).get("next");
    const returnPath =
      nextPath?.startsWith("/") && !nextPath.startsWith("//")
        ? nextPath
        : "/restaurants";

    router.replace(returnPath);
  }, [shouldRedirect, router]);

  return shouldRedirect;
}
