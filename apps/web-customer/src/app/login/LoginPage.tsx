"use client";

import axios from "axios";
import { LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { useLogin } from "@/hooks/useCustomerAuth";
import Alert from "@/components/ui/Alert";
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
