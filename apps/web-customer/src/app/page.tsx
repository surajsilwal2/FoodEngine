"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();

  // Keep the root route useful as both the signed-out entry and signed-in landing page.
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-16 text-zinc-950">
      <section className="w-full max-w-2xl border-l-4 border-emerald-700 pl-6 sm:pl-10">
        <p className="mb-4 text-sm font-semibold uppercase text-emerald-800">
          FoodEngine
        </p>
        <h1 className="text-3xl font-semibold sm:text-4xl">
          {isAuthenticated
            ? `Welcome, ${user?.name}.`
            : "Good food starts here."}
        </h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-zinc-600">
          {isAuthenticated
            ? "Your customer account is ready. Restaurant browsing and ordering will be available here."
            : "Sign in to continue to your customer account."}
        </p>
        <div className="mt-8">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => void logout()}
              className="border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-white"
            >
              Sign out
            </button>
          ) : (
            <Link
              href="/login"
              className="inline-flex bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900"
            >
              Sign in
            </Link>
          )}
        </div>
      </section>
    </main>
  );
}
