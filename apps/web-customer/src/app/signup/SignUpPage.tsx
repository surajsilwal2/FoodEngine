"use client";

import axios from "axios";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { useRegister, useRedirectIfAuthenticated } from "@/hooks/useCustomerAuth";
import { useAuth } from "@/context/AuthContext";
import Alert from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  AuthShell,
  Input,
  SubmitButton,
  inputStyle,
} from "@/components/auth/AuthShell";

const SignUpPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const registerMutation = useRegister();
  const { isReady } = useAuth();
  // A signed-in visitor must not be able to sit on the signup screen.
  const isRedirecting = useRedirectIfAuthenticated();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    try {
      await registerMutation.mutateAsync({ name, email, password });
    } catch (err: unknown) {
      const message = axios.isAxiosError<{ message?: string | string[] }>(err)
        ? err.response?.data?.message
        : undefined;
      setError(
        Array.isArray(message)
          ? message[0]
          : (message ?? "Could not create your account. Please try again."),
      );
    }
  };

  // Hold the form back until the session has been read, so a signed-in visitor
  // never sees the signup form flash before the redirect takes effect. The
  // placeholder mirrors the auth card so nothing jumps when it swaps in.
  if (!isReady || isRedirecting) {
    return (
      <main className="flex flex-1 items-center justify-center bg-canvas px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-card bg-surface p-6 shadow-e3 sm:p-8">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="mt-6 h-7 w-2/3" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-6 h-11 w-full" />
          <Skeleton className="mt-4 h-11 w-full" />
          <Skeleton className="mt-4 h-11 w-full" />
        </div>
      </main>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      description="A few details, then you're ready to find something delicious."
    >
      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {error && <Alert>{error}</Alert>}
        <Input label="Full name" icon={<UserRound className="size-4" />}>
          <input
            type="text"
            autoComplete="name"
            minLength={2}
            maxLength={30}
            required
            disabled={registerMutation.isPending}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            className={inputStyle}
          />
        </Input>
        <Input label="Email address" icon={<Mail className="size-4" />}>
          <input
            type="email"
            autoComplete="email"
            required
            disabled={registerMutation.isPending}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className={inputStyle}
          />
        </Input>
        <Input label="Password" icon={<LockKeyhole className="size-4" />}>
          <input
            type="password"
            autoComplete="new-password"
            required
            disabled={registerMutation.isPending}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputStyle}
          />
        </Input>
        <SubmitButton
          loading={registerMutation.isPending}
          loadingLabel="Creating account..."
        >
          Create account
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
};

export default SignUpPage;
