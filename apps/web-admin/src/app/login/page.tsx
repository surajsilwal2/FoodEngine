"use client";

import { useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { useAdminLogin } from "@/hooks/useAdminAuth";
import { getApiErrorMessage } from "@/lib/api";

export default function AdminLoginPage() {
  const { isReady, isAuthenticated } = useAuth();
  const router = useRouter();
  const loginMutation = useAdminLogin();

  useEffect(() => {
    if (!isReady || !isAuthenticated) return;
    router.replace("/");
  }, [isAuthenticated, isReady, router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    loginMutation.mutate({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
  };

  if (!isReady || isAuthenticated) {
    return (
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md rounded-card bg-surface p-6 shadow-e2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-6 h-11 w-full" />
          <Skeleton className="mt-4 h-11 w-full" />
        </div>
      </main>
    );
  }

  const error = loginMutation.isError
    ? getApiErrorMessage(loginMutation.error)
    : "";

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <section className="w-full max-w-md rounded-card bg-surface p-6 shadow-e2 sm:p-8">
        <p className="font-display text-lg font-semibold text-brand">FoodEngine Admin</p>
        <h1 className="mt-6 font-display text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Use your system administrator account to continue.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {error && <Alert>{error}</Alert>}
          <label className="block space-y-2 text-sm font-semibold">
            <span>Email address</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="username"
              className="w-full rounded-control border border-line bg-surface px-3 py-2.5 font-normal"
            />
          </label>
          <label className="block space-y-2 text-sm font-semibold">
            <span>Password</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-control border border-line bg-surface px-3 py-2.5 font-normal"
            />
          </label>
          <Button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full"
          >
            {loginMutation.isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </section>
    </main>
  );
}