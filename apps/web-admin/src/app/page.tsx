"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import DriverVerificationQueue from "@/components/admin/DriverVerificationQueue";
import MerchantApplicationQueue from "@/components/admin/MerchantApplicationQueue";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { useAdminApplications, useAdminDrivers } from "@/hooks/useAdminDashboard";

/** Platform overview for the two platform-wide review workflows exposed by the backend. */
export default function AdminDashboardPage() {
  const { isReady, isAuthenticated, user, logout } = useAuth();
  const router = useRouter();
  const isSystemAdmin = user?.userRole === "SYSTEM_ADMIN";

  // The saved role gates the UI requests; backend guards still authorize every protected action.
  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace("/login?next=%2F");
  }, [isAuthenticated, isReady, router]);

  const enabled = isReady && isAuthenticated && isSystemAdmin;
  const applicationsQuery = useAdminApplications(enabled);
  const driversQuery = useAdminDrivers(enabled);

  if (!isReady || !isAuthenticated) {
    return (
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-md space-y-4" aria-label="Checking administrator access">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-24" />
        </div>
      </main>
    );
  }

  if (!isSystemAdmin) {
    return (
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <section className="w-full max-w-md space-y-4">
          <Alert>This account does not have system administrator access.</Alert>
          <Button variant="secondary" onClick={() => void logout()}>Sign out</Button>
        </section>
      </main>
    );
  }

  const applications = applicationsQuery.data ?? [];
  const drivers = driversQuery.data ?? [];
  const pendingDrivers = drivers.filter((driver) => !driver.isApproved).length;
  const hasForbiddenError = [applicationsQuery.error, driversQuery.error].some(
    (error) => {
      if (typeof error !== "object" || error === null || !("response" in error)) return false;
      return (error as { response?: { status?: number } }).response?.status === 403;
    },
  );

  return (
    <main className="flex-1 bg-canvas px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand">Platform operations</p>
            <h1 className="mt-1 font-display text-3xl font-semibold">Admin dashboard</h1>
            <p className="mt-2 text-sm leading-6 text-ink-muted">
              Review merchant onboarding and verify delivery partners.
            </p>
          </div>
          <p className="text-sm text-ink-muted">Signed in as {user.name}</p>
        </div>

        <dl className="mt-7 grid grid-cols-2 divide-x divide-line border-y border-line">
          <div className="py-4 pr-5">
            <dt className="text-sm text-ink-muted">Pending merchant applications</dt>
            <dd className="mt-1 font-display text-2xl font-semibold">
              {applicationsQuery.isPending || applicationsQuery.isError ? "—" : applications.length}
            </dd>
          </div>
          <div className="py-4 pl-5">
            <dt className="text-sm text-ink-muted">Drivers awaiting verification</dt>
            <dd className="mt-1 font-display text-2xl font-semibold">
              {driversQuery.isPending || driversQuery.isError ? "—" : pendingDrivers}
            </dd>
          </div>
        </dl>

        {hasForbiddenError && (
          <Alert className="mt-5">
            Administrator access is no longer active. Sign out and sign in again to refresh your permissions.
          </Alert>
        )}

        <nav aria-label="Admin dashboard sections" className="mt-5 flex flex-wrap gap-2">
          <Button href="#applications" size="sm" variant="secondary">Merchant applications</Button>
          <Button href="#drivers" size="sm" variant="secondary">Driver verification</Button>
        </nav>

        <div className="mt-8 space-y-10">
          <MerchantApplicationQueue
            applications={applications}
            isLoading={applicationsQuery.isPending}
            error={applicationsQuery.error}
            onRetry={() => void applicationsQuery.refetch()}
          />
          <DriverVerificationQueue
            drivers={drivers}
            isLoading={driversQuery.isPending}
            error={driversQuery.error}
            onRetry={() => void driversQuery.refetch()}
          />
        </div>
      </div>
    </main>
  );
}