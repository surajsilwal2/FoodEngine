"use client";

import { useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Field, { inputClasses } from "@/components/ui/Field";
import StatusBadge from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { useMerchantAccess } from "@/hooks/useMerchantAccess";
import { useSubmitMerchantApplication } from "@/hooks/useMerchantApplication";
import { getApiErrorMessage } from "@/lib/api";
import { APPLICATION_STATUS } from "@/lib/applicationStatus";

/**
 * Business application form. Shown when the account has no application yet or
 * the last one was rejected. Approved accounts are forwarded to the dashboard
 * and anything already in review is forwarded to /pending, so this page never
 * fights the status it just fetched.
 */
export default function MerchantApplicationPage() {
  const { isReady, isAuthenticated } = useAuth();
  const router = useRouter();
  const {
    isResolving,
    isError,
    error,
    isMerchant,
    application,
    destination,
    refetch,
  } = useMerchantAccess(isReady && isAuthenticated);
  const submitMutation = useSubmitMerchantApplication();

  // Signed-out visitors sign in first, then come straight back here.
  useEffect(() => {
    if (isReady && !isAuthenticated)
      router.replace("/login?next=%2Fapplication");
  }, [isReady, isAuthenticated, router]);

  // Approved accounts belong in the workspace.
  useEffect(() => {
    if (isMerchant) router.replace("/dashboard");
  }, [isMerchant, router]);

  // An application already in review has nothing to edit here.
  useEffect(() => {
    if (destination === "PENDING") router.replace("/pending");
  }, [destination, router]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitMutation.reset();

    // Uncontrolled inputs, pre-filled from the last application, so the values
    // are read straight off the form and trimmed before sending.
    const form = new FormData(event.currentTarget);
    submitMutation.mutate({
      businessName: String(form.get("businessName") ?? "").trim(),
      businessAddress: String(form.get("businessAddress") ?? "").trim(),
      contactPhone: String(form.get("contactPhone") ?? "").trim(),
    });
    // No manual redirect: the mutation seeds the cache and the effect above
    // moves the merchant to the review screen.
  };

  const isLoading = !isReady || (isAuthenticated && isResolving);

  // Approved, but the workspace membership hasn't arrived yet. Showing the form
  // here would only earn an "already submitted" error from the API, so we
  // explain the delay instead.
  const workspaceNotReady = application?.status === "APPROVED" && !isMerchant;

  return (
    <main className="flex-1 bg-canvas px-5 py-10 sm:px-8">
      <section className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-extrabold tracking-tight">
          Apply to sell
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Tell us about your business. Once it&apos;s approved you&apos;ll get a
          workspace to add your restaurant and start taking orders.
        </p>

        {isLoading ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-40 rounded-card" />
            <Skeleton className="h-11 w-40" />
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
            {workspaceNotReady && (
              <section className="rounded-card bg-surface p-5 shadow-e1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-semibold">
                    Almost there
                  </h2>
                  <StatusBadge
                    label={APPLICATION_STATUS.APPROVED.label}
                    tone={APPLICATION_STATUS.APPROVED.tone}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-muted">
                  Your application is approved, but your workspace isn&apos;t
                  ready yet. Try again in a moment — if it still doesn&apos;t
                  appear, contact support.
                </p>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={() => void refetch()}
                >
                  Try again
                </Button>
              </section>
            )}

            {/* Rejection reason, shown before the form so it's read first. */}
            {!workspaceNotReady && application?.status === "REJECTED" && (
              <section className="rounded-card bg-surface p-5 shadow-e1">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-lg font-semibold">
                    Your last application
                  </h2>
                  <StatusBadge
                    label={APPLICATION_STATUS.REJECTED.label}
                    tone={APPLICATION_STATUS.REJECTED.tone}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-muted">
                  {APPLICATION_STATUS.REJECTED.summary}
                </p>
                {application.reviewNote && (
                  <Alert tone="warning" className="mt-4">
                    {application.reviewNote}
                  </Alert>
                )}
              </section>
            )}

            {!workspaceNotReady && submitMutation.isError && (
              <Alert>{getApiErrorMessage(submitMutation.error)}</Alert>
            )}

            {!workspaceNotReady && (
              <form
                onSubmit={handleSubmit}
                className="rounded-card bg-surface p-5 shadow-e1"
              >
                <h2 className="font-display text-lg font-semibold">
                  {application ? "Update your details" : "Business details"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-ink-muted">
                  We only use these details to review your business and set up
                  your workspace.
                </p>

                <div className="mt-5 space-y-4">
                  <Field
                    label="Business name"
                    hint="The name customers will see."
                  >
                    <input
                      name="businessName"
                      required
                      minLength={2}
                      maxLength={100}
                      defaultValue={application?.businessName ?? ""}
                      placeholder="e.g. Sunrise Cafe"
                      className={inputClasses}
                    />
                  </Field>

                  <Field label="Business address" hint="Street, area and city.">
                    <input
                      name="businessAddress"
                      required
                      minLength={5}
                      maxLength={255}
                      defaultValue={application?.businessAddress ?? ""}
                      placeholder="e.g. 48 Market Street, Lakeside"
                      className={inputClasses}
                    />
                  </Field>

                  <Field
                    label="Contact phone"
                    hint="We'll only call this number about your application."
                  >
                    <input
                      name="contactPhone"
                      type="tel"
                      required
                      minLength={7}
                      maxLength={30}
                      defaultValue={application?.contactPhone ?? ""}
                      placeholder="e.g. 9800000000"
                      className={inputClasses}
                    />
                  </Field>
                </div>

                <Button
                  type="submit"
                  disabled={submitMutation.isPending}
                  className="mt-6 w-full sm:w-auto"
                >
                  {submitMutation.isPending
                    ? "Submitting…"
                    : application
                      ? "Resubmit application"
                      : "Submit application"}
                </Button>
              </form>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
