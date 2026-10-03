"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Clock, XCircle } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Field, { inputClasses } from "@/components/ui/Field";
import StatusBadge from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import {
  useMyMerchantApplication,
  useSubmitMerchantApplication,
} from "@/hooks/useMerchantApplication";
import { getApiErrorMessage } from "@/lib/api";
import type {
  MerchantApplicationForm,
  MerchantApplicationStatus,
} from "@/types/tenant";

// Presentation only: maps an application status to its chip and panel copy.
const STATUS_PRESENTATION: Record<
  MerchantApplicationStatus,
  { label: string; tone: "warning" | "success" | "danger"; icon: typeof Clock }
> = {
  PENDING: { label: "Pending review", tone: "warning", icon: Clock },
  APPROVED: { label: "Approved", tone: "success", icon: BadgeCheck },
  REJECTED: { label: "Needs changes", tone: "danger", icon: XCircle },
};

export default function MerchantApplicationPage() {
  const { isAuthenticated, isReady } = useAuth();
  const router = useRouter();

  // All network state lives in the hooks; this page only renders it.
  const applicationQuery = useMyMerchantApplication(isReady && isAuthenticated);
  const submitMutation = useSubmitMerchantApplication();

  const [notice, setNotice] = useState("");

  const application = applicationQuery.data ?? null;
  const canEdit = !application || application.status === "REJECTED";
  const statusPresentation = application
    ? STATUS_PRESENTATION[application.status]
    : null;

  // Send signed-out visitors to sign in, then straight back to this page.
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/login?next=%2Fmerchant-application");
    }
  }, [isAuthenticated, isReady, router]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    submitMutation.reset();

    // The inputs are uncontrolled and pre-filled from the saved application via
    // `defaultValue`, so the values are read straight off the form on submit.
    const values = new FormData(event.currentTarget);
    const payload: MerchantApplicationForm = {
      businessName: String(values.get("businessName") ?? "").trim(),
      businessAddress: String(values.get("businessAddress") ?? "").trim(),
      contactPhone: String(values.get("contactPhone") ?? "").trim(),
    };

    submitMutation.mutate(payload, {
      onSuccess: () => setNotice("Your application was submitted for review."),
    });
  };

  const submitError = submitMutation.isError
    ? getApiErrorMessage(submitMutation.error)
    : "";

  return (
    <main className="flex-1 bg-canvas px-5 py-10 sm:px-8">
      <section className="mx-auto max-w-2xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Sell with us
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-muted">
          Apply for a merchant account. Once approved, you get a workspace where
          you can list your restaurant and start taking orders.
        </p>

        {!isReady || (isAuthenticated && applicationQuery.isPending) ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-40 rounded-card" />
            <Skeleton className="h-11 w-40" />
          </div>
        ) : !isAuthenticated ? (
          <p className="mt-8 text-sm text-ink-muted">
            Taking you to sign in…
          </p>
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
            {application && statusPresentation && (
              <section
                aria-labelledby="application-status-heading"
                className="rounded-card bg-surface p-5 shadow-e1"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2
                    id="application-status-heading"
                    className="font-display text-lg font-semibold"
                  >
                    Application status
                  </h2>
                  <StatusBadge
                    label={statusPresentation.label}
                    tone={statusPresentation.tone}
                  />
                </div>

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
                  {application.tenant && (
                    <>
                      <dt className="text-ink-muted">Workspace</dt>
                      <dd className="font-medium text-ink">
                        {application.tenant.name}
                      </dd>
                    </>
                  )}
                </dl>

                {application.reviewNote && (
                  <Alert
                    tone={
                      application.status === "APPROVED" ? "success" : "warning"
                    }
                    className="mt-4"
                  >
                    {application.reviewNote}
                  </Alert>
                )}
              </section>
            )}

            {notice && <Alert tone="success">{notice}</Alert>}
            {submitError && <Alert>{submitError}</Alert>}

            {canEdit ? (
              <form
                onSubmit={handleSubmit}
                className="rounded-card bg-surface p-5 shadow-e1"
              >
                <h2 className="font-display text-lg font-semibold">
                  {application ? "Update and resubmit" : "Business details"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-ink-muted">
                  {application
                    ? "Fix the details below and send your application back for review."
                    : "We use these details to review your business and set up your workspace."}
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

                  <Field
                    label="Business address"
                    hint="Street, area and city."
                  >
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
                    hint="We'll call this number during review."
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
            ) : (
              <div className="flex items-start gap-3 rounded-card bg-surface p-5 shadow-e1">
                {statusPresentation && (
                  <statusPresentation.icon
                    className="mt-0.5 size-5 shrink-0 text-ink-muted"
                    aria-hidden="true"
                  />
                )}
                <div>
                  <p className="font-semibold text-ink">
                    {statusPresentation?.label}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-ink-muted">
                    {application?.status === "PENDING"
                      ? "Your application is awaiting review. We'll contact you on the number above once it has been processed."
                      : "Your business is approved. Your merchant workspace is ready, and the details above can no longer be edited here."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
