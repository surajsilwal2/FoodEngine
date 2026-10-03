"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import React from "react";
import Button from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";

// Auth fields carry a leading icon, so they add extra left padding on top of
// the shared field styling.
export const inputStyle = `${inputClasses} pl-10 pr-3`;

/**
 * Shared shell for the authentication screens. Lives outside the route folder
 * so the signup page no longer imports from the login route file.
 */
export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-canvas px-4 py-12 sm:px-6">
      {/* Single elevated surface — no border + shadow stacking. */}
      <section className="w-full max-w-md rounded-card bg-surface p-6 shadow-e3 sm:p-8">
        <Link
          href="/"
          className="font-display text-lg font-semibold tracking-tight text-brand"
        >
          FoodEngine
        </Link>
        <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p>
        {children}
      </section>
    </main>
  );
}

/** Labelled input with a leading icon affordance. */
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
    <label className="block text-sm font-medium text-ink">
      {label}
      <span className="relative mt-1.5 block">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
        >
          {icon}
        </span>
        {children}
      </span>
    </label>
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
    <Button type="submit" disabled={loading} className="w-full">
      {loading ? (
        loadingLabel
      ) : (
        <>
          {children}
          <ArrowRight aria-hidden="true" className="size-4" />
        </>
      )}
    </Button>
  );
}
