"use client";

import type { MerchantApplication } from "@/types/tenant";
import { useMyMerchantApplication } from "./useMerchantApplication";
import { useMyTenants } from "./useMyTenants";

/** Which screen this account should be on. */
export type MerchantDestination = "DASHBOARD" | "PENDING" | "APPLICATION";

/**
 * The single source of truth for "what can this account do?".
 *
 * Both requests run together and the pages only read the result. This replaces
 * the duplicated fetch-and-redirect logic that used to live inside every page
 * (and that disagreed with itself — e.g. /pending linked to /application, which
 * immediately redirected back to /pending).
 */
export function useMerchantAccess(enabled = true) {
  const tenantsQuery = useMyTenants(enabled);
  const applicationQuery = useMyMerchantApplication(enabled);

  const isResolving =
    enabled && (tenantsQuery.isPending || applicationQuery.isPending);
  const isError = tenantsQuery.isError || applicationQuery.isError;
  const error = tenantsQuery.error ?? applicationQuery.error;

  const tenants = tenantsQuery.data ?? [];
  const application: MerchantApplication | null = applicationQuery.data ?? null;

  /** An approved application creates a MERCHANT_ADMIN membership. */
  const isMerchant = tenants.some(
    (membership) => membership.role === "MERCHANT_ADMIN",
  );

  // Null while we are still loading or the request failed, so callers never
  // act on a half-known state.
  const destination: MerchantDestination | null =
    !enabled || isResolving || isError
      ? null
      : isMerchant
        ? "DASHBOARD"
        : application?.status === "PENDING"
          ? "PENDING"
          : "APPLICATION";

  /** Re-reads both resources — used by the "Try again" and "Check again" actions. */
  const refetch = async () => {
    await Promise.all([tenantsQuery.refetch(), applicationQuery.refetch()]);
  };

  return {
    isResolving,
    isError,
    error,
    isMerchant,
    tenants,
    application,
    destination,
    refetch,
  };
}
