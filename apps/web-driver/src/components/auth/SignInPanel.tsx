"use client";

import Link from "next/link";
import { Bike } from "lucide-react";
import type { FormEvent } from "react";
import BrandMark from "@/components/layout/BrandMark";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Field, { inputClasses } from "@/components/ui/Field";

/** Sign-in for the driver app, kept out of the console chrome. */
export default function SignInPanel({
  error,
  isPending,
  onSubmit,
}: {
  error: string;
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <Card className="w-full max-w-md p-7 sm:p-9">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <BrandMark role="Driver" />
        </Link>

        <h1 className="mt-6 text-3xl font-bold tracking-tight">
          Sign in to drive
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Use your approved driver account to receive nearby delivery offers.
        </p>

        <form onSubmit={onSubmit} className="mt-7 space-y-4">
          {error && <Alert>{error}</Alert>}
          <Field label="Email address">
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputClasses}
            />
          </Field>
          <Field label="Password">
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className={inputClasses}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={isPending}>
            <Bike className="size-4" aria-hidden="true" />
            {isPending ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
