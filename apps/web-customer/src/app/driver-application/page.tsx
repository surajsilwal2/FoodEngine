"use client";

import { useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Bike, Clock3 } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Field, { inputClasses } from "@/components/ui/Field";
import StatusBadge from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { getApiErrorMessage } from "@/lib/api";
import {
  useMyDriverApplication,
  useSubmitDriverApplication,
} from "@/hooks/useDriverApplication";

const DRIVER_APP_URL =
  process.env.NEXT_PUBLIC_DRIVER_APP_URL || "http://localhost:3002";

export default function DriverApplicationPage() {
  const { isAuthenticated, isReady } = useAuth();
  const router = useRouter();
  const applicationQuery = useMyDriverApplication(isReady && isAuthenticated);
  const submitMutation = useSubmitDriverApplication();
  const application = applicationQuery.data ?? null;

  // Send signed-out customers through the same account flow used for merchant applications.
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/login?next=%2Fdriver-application");
    }
  }, [isAuthenticated, isReady, router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    submitMutation.mutate({
      licenseNumber: String(form.get("licenseNumber") ?? "").trim(),
      vehicleDetails: String(form.get("vehicleDetails") ?? "").trim(),
    });
  };

  const isLoading = !isReady || (isAuthenticated && applicationQuery.isPending);

  return (
    <main className="flex-1 bg-canvas px-5 py-10 sm:px-8">
      <section className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold text-brand">Delivery network</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Drive with us
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Submit your driving and vehicle details for review. Once approved, you
          can receive delivery offers in the driver workspace.
        </p>

        {isLoading ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-32 rounded-card" />
            <Skeleton className="h-11 w-40" />
          </div>
        ) : !isAuthenticated ? (
          <p className="mt-8 text-sm text-ink-muted">Taking you to sign in…</p>
        ) : applicationQuery.isError ? (
          <div className="mt-8 space-y-3">
            <Alert>{getApiErrorMessage(applicationQuery.error)}</Alert>
            <Button
              variant="secondary"
              onClick={() => void applicationQuery.refetch()}
            >
              Try again
            </Button>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {submitMutation.isError && (
              <Alert>{getApiErrorMessage(submitMutation.error)}</Alert>
            )}

            {application ? (
              <section className="rounded-card bg-surface p-5 shadow-e1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-semibold">
                    Application status
                  </h2>
                  <StatusBadge
                    label={application.isApproved ? "Approved" : "Pending review"}
                    tone={application.isApproved ? "success" : "warning"}
                  />
                </div>
                <dl className="mt-4 grid gap-x-4 gap-y-2.5 text-sm sm:grid-cols-[10rem_1fr]">
                  <dt className="text-ink-muted">License number</dt>
                  <dd className="font-medium">{application.licenseNumber}</dd>
                  <dt className="text-ink-muted">Vehicle</dt>
                  <dd className="font-medium">{application.vehicleDetails}</dd>
                </dl>
                {application.isApproved ? (
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Alert tone="success" className="flex-1">
                      Your profile is approved. You can now sign in to the
                      driver workspace.
                    </Alert>
                    <Button href={DRIVER_APP_URL}>
                      <Bike className="size-4" aria-hidden="true" />
                      Open driver workspace
                    </Button>
                  </div>
                ) : (
                  <p className="mt-5 flex items-center gap-2 text-sm text-ink-muted">
                    <Clock3 className="size-4 text-warning" aria-hidden="true" />
                    Your details are with our team for review.
                  </p>
                )}
              </section>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-card bg-surface p-5 shadow-e1"
              >
                <h2 className="font-display text-lg font-semibold">
                  Driver details
                </h2>
                <div className="mt-5 space-y-4">
                  <Field label="License number">
                    <input
                      name="licenseNumber"
                      required
                      maxLength={50}
                      className={inputClasses}
                    />
                  </Field>
                  <Field
                    label="Vehicle details"
                    hint="Include vehicle type and identifying details."
                  >
                    <input
                      name="vehicleDetails"
                      required
                      maxLength={255}
                      placeholder="e.g. black scooter, plate number"
                      className={inputClasses}
                    />
                  </Field>
                </div>
                <Button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="mt-6"
                >
                  {submitMutation.isPending
                    ? "Submitting…"
                    : "Submit driver application"}
                </Button>
              </form>
            )}
          </div>
        )}
      </section>
    </main>
  );
}