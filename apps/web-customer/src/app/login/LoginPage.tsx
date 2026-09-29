"use client";

import axios from "axios";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

const inputStyle =
  "w-full rounded-lg border border-zinc-300 bg-white py-2.5 pr-3 pl-10 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-zinc-100";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", { email, password });
      login(response.data.accessToken, response.data.user);
      router.replace("/restaurants");
    } catch (err: unknown) {
      setError(
        axios.isAxiosError<{ message?: string }>(err)
          ? (err.response?.data?.message ??
              "Login failed. Please check your credentials.")
          : "Login failed. Please check your credentials.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to your account"
      description="Discover restaurants and keep your next meal moving."
    >
      <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        {error && <Alert message={error} />}
        <Input label="Email address" icon={<Mail className="size-4" />}>
          <input
            type="email"
            autoComplete="email"
            required
            disabled={isLoading}
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
            disabled={isLoading}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputStyle}
          />
        </Input>
        <SubmitButton loading={isLoading} loadingLabel="Signing in...">
          Sign in
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-600">
        New to FoodEngine?{" "}
        <Link
          href="/signup"
          className="font-semibold text-emerald-800 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
};

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 px-4 py-12 sm:px-6">
      <section className="mx-auto w-full max-w-md rounded-2xl border border-emerald-100 bg-white p-6 shadow-xl shadow-emerald-950/5 sm:p-8">
        <Link
          href="/"
          className="text-sm font-bold tracking-tight text-emerald-800"
        >
          FoodEngine
        </Link>
        <p className="mt-7 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">{description}</p>
        {children}
      </section>
    </main>
  );
}

export function Input({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactElement;
}) {
  return (
    <label className="block text-sm font-medium text-zinc-700">
      {label}
      <span className="relative mt-1.5 block">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        >
          {icon}
        </span>
        {children}
      </span>
    </label>
  );
}

export function Alert({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {message}
    </p>
  );
}

export function SubmitButton({
  loading,
  loadingLabel,
  children,
}: {
  loading: boolean;
  loadingLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 focus:outline-none focus:ring-4 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:bg-emerald-400"
    >
      {loading ? (
        loadingLabel
      ) : (
        <>
          {children}
          <ArrowRight aria-hidden="true" className="size-4" />
        </>
      )}
    </button>
  );
}

export default LoginPage;
