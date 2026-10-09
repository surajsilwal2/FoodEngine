"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export interface MerchantAuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: { id: number; name: string; email: string };
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  name: string;
}

/**
 * Where to send someone after signing in. Honours a safe `?next=` target so a
 * merchant who was bounced out of /dashboard lands back there, and falls back to
 * the entry route, which works out the right screen for the account.
 */
function postLoginPath(): string {
  if (typeof window === "undefined") return "/";
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}

/** Signs a merchant in and stores the returned session. */
export function useLogin() {
  const { setSession } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: async (payload: LoginPayload) =>
      (await api.post<MerchantAuthResponse>("/auth/login", payload)).data,
    onSuccess: (data) => {
      setSession(data.accessToken, data.user, data.refreshToken);
      router.replace(postLoginPath());
    },
  });
}

/**
 * Creates a FoodEngine account. The backend always creates a customer account
 * first — merchant access is granted later, when the application is approved.
 */
export function useRegister() {
  const { setSession } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: async (payload: RegisterPayload) =>
      (await api.post<MerchantAuthResponse>("/auth/register", payload)).data,
    onSuccess: (data) => {
      setSession(data.accessToken, data.user, data.refreshToken);
      router.replace(postLoginPath());
    },
  });
}

/**
 * Keeps an already-signed-in merchant away from the sign-in screen. Returns true
 * while the redirect is in flight so the page can show a placeholder instead of
 * flashing the form at someone who already has a session.
 */
export function useRedirectIfAuthenticated() {
  const { isReady, isAuthenticated } = useAuth();
  const router = useRouter();
  const shouldRedirect = isReady && isAuthenticated;

  useEffect(() => {
    if (!shouldRedirect) return;
    router.replace(postLoginPath());
  }, [shouldRedirect, router]);

  return shouldRedirect;
}
