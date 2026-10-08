"use client";

import { api } from "@/lib/api";
import type {
  AdminDriverProfile,
  AdminMerchantApplication,
  MerchantApplicationDecision,
} from "@/types/admin";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const ADMIN_APPLICATIONS_KEY = ["admin", "merchant-applications"];
export const ADMIN_DRIVERS_KEY = ["admin", "drivers"];

// This guarded endpoint returns only work that an administrator can review now.
export function useAdminApplications(enabled: boolean) {
  return useQuery<AdminMerchantApplication[]>({
    queryKey: ADMIN_APPLICATIONS_KEY,
    queryFn: async () =>
      (await api.get("/tenant/applications/pending")).data,
    enabled,
  });
}

// Review and list data share a cache key so a completed decision disappears from the queue.
export function useReviewMerchantApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      applicationId: number;
      decision: MerchantApplicationDecision;
      reviewNote?: string;
    }) =>
      (
        await api.patch(
          `/tenant/applications/${input.applicationId}/review`,
          { decision: input.decision, reviewNote: input.reviewNote },
        )
      ).data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_APPLICATIONS_KEY }),
  });
}

// The API returns every driver profile; the view separates pending and approved profiles locally.
export function useAdminDrivers(enabled: boolean) {
  return useQuery<AdminDriverProfile[]>({
    queryKey: ADMIN_DRIVERS_KEY,
    queryFn: async () => (await api.get("/driver/admin/list")).data,
    enabled,
  });
}

// Refresh the driver list after approval or revocation to reflect the server's resulting state.
export function useSetDriverApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { driverProfileId: number; isApproved: boolean }) =>
      (
        await api.patch(`/driver/admin/${input.driverProfileId}/approve`, {
          isApproved: input.isApproved,
        })
      ).data,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_DRIVERS_KEY }),
  });
}