"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

interface LoginPayload {
  email: string;
  password: string;
}

interface AuthResponse {
  accessToken: string;
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
      login(data.accessToken, data.user);
      router.replace("/restaurants");
    },
  });
}
