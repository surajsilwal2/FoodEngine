"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

interface LoginPayload {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken?: string;
  user: {
    id: number;
    name: string;
    email: string;
    userRole: string;
  };
}

function postLoginPath(): string {
  if (typeof window === "undefined") return "/";
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export function useAdminLogin() {
  const { setSession } = useAuth();
  const router = useRouter();

  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await api.post<LoginResponse>("/auth/login", payload);
      if (data.user.userRole !== "SYSTEM_ADMIN") {
        throw new Error("This account does not have system administrator access.");
      }
      return data;
    },
    onSuccess: (data) => {
      setSession(data.accessToken, data.user, data.refreshToken);
      router.replace(postLoginPath());
    },
  });
}