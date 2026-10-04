"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { useMerchantAccess } from "@/hooks/useMerchantAccess";
import { getApiErrorMessage } from "@/lib/api";

/** Turns a membership role into plain language. */
function roleLabel(role: string): string {
  if (role === "MERCHANT_ADMIN") return "Owner";
  return role.replaceAll("_", " ").toLowerCase();
}

/**
 * Landing screen for an approved merchant. It shows which workspace the account
 * can use. Restaurant setup and order management are not built yet, and the page
 * says that plainly instead of hinting at features that don't exist.
 */
export default function MerchantDashboardPage() {
  const { isReady, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const { isResolving, isError, error, isMerchant, tenants, refetch } =
    useMerchantAccess(isReady && isAuthenticated);

  // Remember the page so signing in returns here.
  useEffect(() => {
    if (isReady && !isAuthenticated)
      router.replace("/login?next=%2Fdashboard");
  }, [isReady, isAuthenticated, router]);

  // Any account without a merchant workspace gets routed from the entry page,
  // which knows whether they should apply or wait for review.
  useEffect(() => {
    if (isReady && isAuthenticated && !isResolving && !isError && !isMerchant) {
      router.replace("/");
    }
  }, [isReady, isAuthenticated, isResolving, isError, isMerchant, router]);

  const isLoading = !isReady || (isAuthenticated && isResolving);
  const merchantTenants = tenants.filter(
    (tenant) => tenant.role === "MERCHANT_ADMIN",
  );

  return (
    <main className="flex-1 bg-canvas px-5 py-10 sm:px-8">
      <section className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {user?.name ? `Welcome back, ${user.name}.` : "Welcome back."}
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Your merchant account is approved. Here&apos;s your workspace.
        </p>

        {isLoading ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-32 rounded-card" />
            <Skeleton className="h-28 rounded-card" />
          </div>
        ) : isError ? (
          <div className="mt-8 space-y-3">
            <Alert>{getApiErrorMessage(error)}</Alert>
            <Button variant="secondary" onClick={() => void refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <section className="rounded-card bg-surface p-5 shadow-e1">
              <h2 className="font-display text-lg font-semibold">
                Your workspace
              </h2>
              <ul className="mt-4 divide-y divide-line">
                {merchantTenants.map((tenant) => (
                  <li
                    key={tenant.tenantId}
                    className="flex items-center gap-3 py-3 text-sm"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-control bg-brand-soft text-brand">
                      <Building2 className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 truncate font-medium text-ink">
                      {tenant.tenantName}
                    </span>
                    <span className="ml-auto shrink-0 text-ink-muted">
                      {roleLabel(tenant.role)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-card bg-surface p-5 shadow-e1">
              <h2 className="font-display text-lg font-semibold">Coming next</h2>
              <p className="mt-2 text-sm leading-6 text-ink-muted">
                Adding your restaurant menu and managing incoming orders
                aren&apos;t available yet, so there&apos;s nothing to do here for
                now.
              </p>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
