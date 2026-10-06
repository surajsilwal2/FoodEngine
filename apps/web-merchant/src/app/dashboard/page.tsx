"use client";

import { useEffect } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ClipboardList,
  MapPin,
  UtensilsCrossed,
} from "lucide-react";
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
 * can use. Operational links stay visible so the owner can move directly from
 * workspace setup into restaurant and order management.
 */
export default function MerchantDashboardPage() {
  const { isReady, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const {
    isResolving,
    isError,
    error,
    isMerchant,
    tenants,
    application,
    refetch,
  } = useMerchantAccess(isReady && isAuthenticated);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);

  // Remember the page so signing in returns here.
  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace("/login?next=%2Fdashboard");
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
  const activeTenant =
    merchantTenants.find((tenant) => tenant.tenantId === selectedTenantId) ??
    merchantTenants[0] ??
    null;

  return (
    <main className="flex-1 bg-canvas px-5 py-10 sm:px-8">
      <section className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {user?.name ? `Welcome back, ${user.name}.` : "Welcome back."}
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Your workspace access is verified from your approved tenant
          membership.
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
            {merchantTenants.length > 1 && (
              <label className="block max-w-sm space-y-2 text-sm font-semibold">
                <span>Active workspace</span>
                <select
                  value={activeTenant?.tenantId ?? ""}
                  onChange={(event) =>
                    setSelectedTenantId(Number(event.target.value))
                  }
                  className="w-full rounded-control border border-line bg-surface px-3 py-2.5 font-normal"
                >
                  {merchantTenants.map((tenant) => (
                    <option key={tenant.tenantId} value={tenant.tenantId}>
                      {tenant.tenantName}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {activeTenant && (
              <section className="rounded-card bg-surface p-5 shadow-e1">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-control bg-brand-soft text-brand">
                      <Building2 className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h2 className="font-display text-xl font-semibold">
                        {activeTenant.tenantName}
                      </h2>
                      <p className="mt-1 text-sm text-ink-muted">
                        {roleLabel(activeTenant.role)} · Workspace #
                        {activeTenant.tenantId}
                      </p>
                    </div>
                  </div>
                  {application?.status === "APPROVED" && (
                    <span className="rounded-control bg-brand-soft px-3 py-1.5 text-sm font-semibold text-brand">
                      Approved
                    </span>
                  )}
                </div>
                <p className="mt-5 border-t border-line pt-4 text-sm text-ink-muted">
                  Signed in as {user?.email}. The backend confirmed your
                  merchant membership for this workspace.
                </p>
              </section>
            )}

            <section aria-labelledby="workspace-setup-heading">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2
                    id="workspace-setup-heading"
                    className="font-display text-lg font-semibold"
                  >
                    Workspace setup
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    Manage locations in this business workspace.
                  </p>
                </div>
                <Button href="/restaurants" variant="secondary" size="sm">
                  Manage restaurants
                </Button>
              </div>

              <ul className="mt-4 divide-y divide-line border-y border-line">
                <li className="flex items-center gap-3 py-4">
                  <MapPin
                    className="size-5 text-ink-muted"
                    aria-hidden="true"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">
                      Restaurant management
                    </span>
                    <span className="mt-1 block text-sm text-ink-muted">
                      View locations, update their details, and set open or
                      closed state.
                    </span>
                  </span>
                  <span className="text-sm text-ink-muted">Available</span>
                </li>
                <li className="flex items-center gap-3 py-4">
                  <UtensilsCrossed
                    className="size-5 text-ink-muted"
                    aria-hidden="true"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">Menu</span>
                    <span className="mt-1 block text-sm text-ink-muted">
                      Add categories, dishes, prices, and availability.
                    </span>
                  </span>
                  <span className="text-sm text-ink-muted">Not connected</span>
                </li>
                <li className="flex items-center gap-3 py-4">
                  <ClipboardList
                    className="size-5 text-ink-muted"
                    aria-hidden="true"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">Orders</span>
                    <span className="mt-1 block text-sm text-ink-muted">
                      Paid customer orders appear here after checkout succeeds.
                    </span>
                  </span>
                    <Button href="/orders" variant="secondary" size="sm">
                      Open orders
                    </Button>
                </li>
              </ul>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
