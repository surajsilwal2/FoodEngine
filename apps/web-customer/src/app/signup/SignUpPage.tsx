"use client";

import axios from "axios";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { useRegister } from "@/hooks/useCustomerAuth";
import { Alert, AuthShell, Input, SubmitButton } from "../login/LoginPage";

const inputStyle =
  "w-full rounded-lg border border-zinc-300 bg-white py-2.5 pr-3 pl-10 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-zinc-100";

const SignUpPage = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const registerMutation = useRegister();
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
  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      description="A few details, then you're ready to find something delicious."
    >
      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        {error && <Alert message={error} />}
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
      <p className="mt-6 text-center text-sm text-zinc-600">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-emerald-800 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
};

export default SignUpPage;
