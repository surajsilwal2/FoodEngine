"use client";

import axios from "axios";
import { LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { useLogin, useRedirectIfAuthenticated } from "@/hooks/useCustomerAuth";
import { useAuth } from "@/context/AuthContext";
import Alert from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  AuthShell,
  Input,
  SubmitButton,
  inputStyle,
} from "@/components/auth/AuthShell";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const loginMutation = useLogin();
  const { isReady } = useAuth();
  // A signed-in visitor must not be able to sit on the login screen.
  const isRedirecting = useRedirectIfAuthenticated();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await loginMutation.mutateAsync({ email, password });
    } catch (err: unknown) {
      setError(
        axios.isAxiosError<{ message?: string }>(err)
          ? (err.response?.data?.message ??
              "Login failed. Please check your credentials.")
          : "Login failed. Please check your credentials.",
      );
    }
  };

  // Hold the form back until the session has been read, so a signed-in visitor
  // never sees the login form flash before the redirect takes effect. The
  // placeholder mirrors the auth card so nothing jumps when it swaps in.
  if (!isReady || isRedirecting) {
    return (
      <main className="flex flex-1 items-center justify-center bg-canvas px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-e3 sm:p-8">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="mt-6 h-7 w-2/3" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-6 h-11 w-full" />
          <Skeleton className="mt-4 h-11 w-full" />
        </div>
      </main>
    );
  }

  return (
    <AuthShell
      title="Sign in to your account"
      description="Discover restaurants and keep your next meal moving."
    >
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {error && <Alert>{error}</Alert>}
        <Input label="Email address" icon={<Mail className="size-4" />}>
          <input
            type="email"
            autoComplete="email"
            required
            disabled={loginMutation.isPending}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className={inputStyle}
          />
        </Input>
        <Input label="Password" icon={<LockKeyhole className="size-4" />}>
          <input
            type="password"
            autoComplete="current-password"
            required
            disabled={loginMutation.isPending}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputStyle}
          />
        </Input>
        <SubmitButton
          loading={loginMutation.isPending}
          loadingLabel="Signing in..."
        >
          Sign in
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        New to FoodEngine?{" "}
        <Link
          href="/signup"
          className="font-semibold text-brand hover:underline"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
};

// Re-exported for backwards compatibility with any existing import path.
export { AuthShell, Input, SubmitButton } from "@/components/auth/AuthShell";

export default LoginPage;
