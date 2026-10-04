"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Field, { inputClasses } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import {
  useLogin,
  useRedirectIfAuthenticated,
  useRegister,
} from "@/hooks/useMerchantAuth";
import { getApiErrorMessage } from "@/lib/api";

/**
 * Sign in, or create a FoodEngine account. Creating an account here makes a
 * normal FoodEngine account — merchant access is granted later, when the
 * business application is approved.
 */
export default function MerchantLoginPage() {
  const { isReady } = useAuth();
  const isRedirecting = useRedirectIfAuthenticated();
  const [isRegistering, setIsRegistering] = useState(false);

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const activeMutation = isRegistering ? registerMutation : loginMutation;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const details = {
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
      name: String(form.get("name") ?? "").trim(),
    };

    if (isRegistering) registerMutation.mutate(details);
    else {
      loginMutation.mutate({
        email: details.email,
        password: details.password,
      });
    }
  };

  // Hold the form back until the session has been read, so a signed-in merchant
  // never sees it flash before the redirect. The placeholder mirrors the card
  // so nothing jumps when the real form swaps in.
  if (!isReady || isRedirecting) {
    return (
      <main className="flex flex-1 items-center justify-center bg-canvas px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-card bg-surface p-6 shadow-e3 sm:p-8">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="mt-6 h-7 w-2/3" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-6 h-11 w-full" />
          <Skeleton className="mt-4 h-11 w-full" />
        </div>
      </main>
    );
  }

  const error = activeMutation.isError
    ? getApiErrorMessage(activeMutation.error)
    : "";

  return (
    <main className="flex flex-1 items-center justify-center bg-canvas px-4 py-12 sm:px-6">
      <section className="w-full max-w-md rounded-card bg-surface p-6 shadow-e3 sm:p-8">
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight text-brand"
        >
          FoodEngine Merchant
        </Link>

        <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight">
          {isRegistering ? "Create your account" : "Sign in"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          {isRegistering
            ? "Create a FoodEngine account to get started. You'll add your business details on the next screen."
            : "Sign in with your FoodEngine account to check your application or open your workspace."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {error && <Alert>{error}</Alert>}

          {isRegistering && (
            <Field label="Your name">
              <input
                name="name"
                required
                minLength={2}
                maxLength={30}
                autoComplete="name"
                placeholder="e.g. Alex Shrestha"
                className={inputClasses}
              />
            </Field>
          )}

          <Field label="Email address">
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className={inputClasses}
            />
          </Field>

          <Field label="Password">
            <input
              name="password"
              type="password"
              required
              autoComplete={isRegistering ? "new-password" : "current-password"}
              className={inputClasses}
            />
          </Field>

          <Button
            type="submit"
            disabled={activeMutation.isPending}
            className="w-full"
          >
            {activeMutation.isPending
              ? isRegistering
                ? "Creating account…"
                : "Signing in…"
              : isRegistering
                ? "Create account"
                : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          {isRegistering ? "Already have an account? " : "New to FoodEngine? "}
          <button
            type="button"
            onClick={() => {
              // Clear any previous error so the other mode starts clean.
              loginMutation.reset();
              registerMutation.reset();
              setIsRegistering((current) => !current);
            }}
            className="font-semibold text-brand hover:underline"
          >
            {isRegistering ? "Sign in instead" : "Create an account"}
          </button>
        </p>
      </section>
    </main>
  );
}
