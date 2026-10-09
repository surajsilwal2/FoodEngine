"use client";

import type { FormEvent } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Field, { inputClasses } from "@/components/ui/Field";

/** Collects the licence and vehicle details a new driver must submit. */
export default function ApplyPanel({
  error,
  isPending,
  onSubmit,
}: {
  error: string;
  isPending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <Card className="mx-auto mt-8 w-full max-w-2xl p-6 sm:p-8">
      <h1 className="text-2xl font-bold tracking-tight">Apply to deliver</h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">
        Submit your licence and vehicle details. You can go online once an
        administrator approves your profile.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {error && <Alert>{error}</Alert>}
        <Field label="Licence number">
          <input
            name="licenseNumber"
            required
            maxLength={50}
            className={inputClasses}
          />
        </Field>
        <Field
          label="Vehicle details"
          hint="Vehicle type and colour, as your customers will see it."
        >
          <input
            name="vehicleDetails"
            required
            maxLength={255}
            placeholder="Black scooter"
            className={inputClasses}
          />
        </Field>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Submitting…" : "Submit application"}
        </Button>
      </form>
    </Card>
  );
}
