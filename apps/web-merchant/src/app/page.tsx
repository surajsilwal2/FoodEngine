"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { useMerchantAccess } from "@/hooks/useMerchantAccess";
import { getApiErrorMessage } from "@/lib/api";

/**
 * Entry route. It never shows content of its own: it works out whether the
 * account is an approved merchant, still waiting for review, or needs to apply,
 * then forwards to the matching screen.
 */
export default function EntryPage() {
  const { isReady, isAuthenticated } = useAuth();
  const router = useRouter();
  const { isResolving, isError, error, destination, refetch } =
    useMerchantAccess(isReady && isAuthenticated);

  // Signed-out visitors sign in first, then come back here to be routed.
  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace("/login?next=%2F");
  }, [isReady, isAuthenticated, router]);

  // The single forwarding decision — pages no longer each guess this.
  useEffect(() => {
    if (!destination) return;
    if (destination === "DASHBOARD") router.replace("/dashboard");
    else if (destination === "PENDING") router.replace("/pending");
    else router.replace("/application");
  }, [destination, router]);

  return (
    <main className="flex flex-1 items-center justify-center bg-canvas px-5 py-16">
      <section className="w-full max-w-md rounded-card bg-surface p-6 shadow-e1">
        <h1 className="text-xl font-extrabold tracking-tight">
          Checking your account…
        </h1>

        {isError ? (
          <div className="mt-4 space-y-3">
            <Alert>{getApiErrorMessage(error)}</Alert>
            <Button variant="secondary" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-ink-muted">
              {isResolving
                ? "Looking up your application and workspace access."
                : "Taking you to the right page…"}
            </p>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}
      </section>
    </main>
  );
}
