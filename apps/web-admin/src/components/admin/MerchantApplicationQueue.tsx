"use client";

import { useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useReviewMerchantApplication } from "@/hooks/useAdminDashboard";
import { getApiErrorMessage } from "@/lib/api";
import type {
  AdminMerchantApplication,
  MerchantApplicationDecision,
} from "@/types/admin";

function ApplicationRow({
  application,
}: {
  application: AdminMerchantApplication;
}) {
  const [reviewNote, setReviewNote] = useState("");
  const [actionError, setActionError] = useState("");
  const reviewMutation = useReviewMerchantApplication();

  // The API creates a tenant only after approval, so both decisions use this review operation.
  const review = (decision: MerchantApplicationDecision) => {
    setActionError("");
    reviewMutation.mutate(
      {
        applicationId: application.id,
        decision,
        reviewNote: reviewNote.trim() || undefined,
      },
      { onError: (error: unknown) => setActionError(getApiErrorMessage(error)) },
    );
  };

  return (
    <li className="rounded-card border border-line bg-surface p-5 shadow-e1">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">{application.businessName}</h3>
          <p className="mt-1 text-sm text-ink-muted">
            {application.applicant.name} · {application.applicant.email}
          </p>
        </div>
        <time dateTime={application.createdAt} className="text-sm text-ink-muted">
          Submitted {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(application.createdAt))}
        </time>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-semibold">Business address</dt>
          <dd className="mt-1 text-ink-muted">{application.businessAddress}</dd>
        </div>
        <div>
          <dt className="font-semibold">Contact phone</dt>
          <dd className="mt-1 text-ink-muted">{application.contactPhone}</dd>
        </div>
      </dl>

      <label className="mt-4 block space-y-1.5 text-sm font-semibold">
        <span>Review note (optional)</span>
        <textarea
          value={reviewNote}
          onChange={(event) => setReviewNote(event.target.value)}
          maxLength={1000}
          rows={2}
          className="w-full resize-y rounded-control border border-line bg-surface px-3 py-2 font-normal"
        />
      </label>

      {actionError && <Alert className="mt-3">{actionError}</Alert>}
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={reviewMutation.isPending}
          onClick={() => review("APPROVED")}
        >
          {reviewMutation.isPending ? "Saving…" : "Approve application"}
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={reviewMutation.isPending}
          onClick={() => review("REJECTED")}
        >
          Reject
        </Button>
      </div>
    </li>
  );
}

/** Keeps application review loading, failure, and empty states inside this workflow. */
export default function MerchantApplicationQueue({
  applications,
  isLoading,
  error,
  onRetry,
}: {
  applications: AdminMerchantApplication[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <section id="applications" aria-labelledby="applications-heading" className="scroll-mt-24">
      <p className="text-xs font-bold uppercase tracking-wide text-brand">
        Merchant onboarding
      </p>
      <h2
        id="applications-heading"
        className="mt-1 text-xl font-extrabold tracking-tight"
      >
        Pending applications
      </h2>

      {isLoading ? (
        <div className="mt-4 space-y-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : error ? (
        <div className="mt-4 space-y-3">
          <Alert>{getApiErrorMessage(error)}</Alert>
          <Button size="sm" variant="secondary" onClick={onRetry}>Retry applications</Button>
        </div>
      ) : applications.length === 0 ? (
        <p className="mt-4 rounded-card border border-dashed border-line px-4 py-8 text-center text-sm text-ink-muted">
          No merchant applications are waiting for review.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {applications.map((application) => (
            <ApplicationRow key={application.id} application={application} />
          ))}
        </ul>
      )}
    </section>
  );
}