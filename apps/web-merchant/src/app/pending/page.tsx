"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { useMerchantAccess } from "@/hooks/useMerchantAccess";
import { getApiErrorMessage } from "@/lib/api";
import { APPLICATION_STATUS } from "@/lib/applicationStatus";

/**
 * "Waiting for review" screen. The status only changes when a system admin
 * reviews the application, so the merchant re-checks on demand. The submitted
 * details are shown here too, which is why this page no longer needs a link back
 * to the form (that link used to bounce straight back here).
 */
export default function MerchantPendingPage() {
  const { isReady, isAuthenticated } = useAuth();
  const router = useRouter();
  const { isResolving, isError, error, isMerchant, application, destination, refetch } =
    useMerchantAccess(isReady && isAuthenticated);

  const [isChecking, setIsChecking] = useState(false);
  const [checkedAndStillPending, setCheckedAndStillPending] = useState(false);

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace("/login?next=%2Fpending");
  }, [isReady, isAuthenticated, router]);

  // Approved while this page was open: go to the workspace.
  useEffect(() => {
    if (isMerchant) router.replace("/dashboard");
  }, [isMerchant, router]);

  // Nothing waiting on review any more (no application, or it was rejected):
  // the merchant belongs on the application form.
  useEffect(() => {
    if (destination === "APPLICATION") router.replace("/application");
  }, [destination, router]);

  const handleCheckAgain = async () => {
    setIsChecking(true);
    setCheckedAndStillPending(false);
    await refetch();
    setIsChecking(false);
    // Only reached when the status did not change (a change would redirect).
    setCheckedAndStillPending(true);
  };

  const isLoading = !isReady || (isAuthenticated && isResolving);

  return (
    <main className="flex-1 bg-canvas px-5 py-10 sm:px-8">
      <section className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Application in review
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Thanks for applying. Our team is checking your details — you
          can&apos;t make changes while a review is in progress.
        </p>

        {isLoading ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-32 rounded-card" />
            <Skeleton className="h-11 w-36" />
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
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">
                  What we received
                </h2>
                <StatusBadge
                  label={APPLICATION_STATUS.PENDING.label}
                  tone={APPLICATION_STATUS.PENDING.tone}
                />
              </div>

              {application ? (
                <dl className="mt-4 grid gap-x-4 gap-y-2.5 text-sm sm:grid-cols-[10rem_1fr]">
                  <dt className="text-ink-muted">Business</dt>
                  <dd className="font-medium text-ink">
                    {application.businessName}
                  </dd>
                  <dt className="text-ink-muted">Address</dt>
                  <dd className="font-medium text-ink">
                    {application.businessAddress}
                  </dd>
                  <dt className="text-ink-muted">Contact phone</dt>
                  <dd className="font-medium text-ink">
                    {application.contactPhone}
                  </dd>
                </dl>
              ) : (
                <p className="mt-4 text-sm leading-6 text-ink-muted">
                  We couldn&apos;t load your application details. Use “Check
                  again” below.
                </p>
              )}
            </section>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => void handleCheckAgain()}
                disabled={isChecking}
              >
                {isChecking ? "Checking…" : "Check again"}
              </Button>
              {checkedAndStillPending && (
                <span className="text-sm text-ink-muted">
                  Still waiting for review.
                </span>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
