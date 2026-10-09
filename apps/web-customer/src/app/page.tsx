"use client";

import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import Link from "next/link";

export default function Home() {
  const { user, isAuthenticated, isReady, logout } = useAuth();

  // Wait for the persisted session to be read before deciding which state to
  // show, so this page never flashes the signed-out copy on first paint.
  if (!isReady) {
    return (
      <main className="flex flex-1 items-center justify-center bg-canvas px-5 py-16">
        <div className="w-full max-w-2xl">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="mt-3 h-10 w-3/4" />
          <Skeleton className="mt-4 h-5 w-full" />
          <Skeleton className="mt-8 h-11 w-48" />
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-canvas px-5 py-16 sm:px-8">
      <section className="w-full max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-wide text-brand">
          FoodEngine
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          {isAuthenticated
            ? `Welcome back, ${user?.name}.`
            : "Good food starts here."}
        </h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-ink-muted">
          {isAuthenticated
            ? "Browse local restaurants, place an order, and follow it from the kitchen to your door."
            : "Sign in to browse restaurants and place your next order."}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {isAuthenticated ? (
            <>
              <Button href="/restaurants">Browse restaurants</Button>
              <Button href="/orders" variant="secondary">
                Your orders
              </Button>
              <Button onClick={() => void logout()} variant="ghost">
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button href="/login">Sign in</Button>
              <Button href="/signup" variant="secondary">
                Create an account
              </Button>
            </>
          )}
        </div>

        {/* Second entry point into the merchant onboarding flow. */}
        <p className="mt-8 text-sm text-ink-muted">
          Own a restaurant?{" "}
          <Link
            href="/merchant-application"
            className="font-bold text-brand hover:underline"
          >
            Sell with us
          </Link>
        </p>
      </section>
    </main>
  );
}
