"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "@/lib/api";
import { driverProfileKey, type DriverProfile } from "@/lib/queries";

/**
 * The driver profile doubles as the application record: it exists before
 * approval so new applicants can see their review state, and carries the
 * availability flag once approved.
 */
export function useDriverProfile(token: string) {
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState("");

  const profileQuery = useQuery<DriverProfile>({
    queryKey: driverProfileKey,
    queryFn: async () => (await api.get("/driver/me")).data,
    enabled: Boolean(token),
    retry: false,
  });

  const applyMutation = useMutation({
    mutationFn: async (values: {
      licenseNumber: string;
      vehicleDetails: string;
    }) => (await api.post("/driver/apply", values)).data,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: driverProfileKey }),
    onError: (error: unknown) => setActionError(getApiErrorMessage(error)),
  });

  // A 404 means "no profile yet", which is a normal state for a new applicant
  // rather than a failure worth showing an error for.
  const missingProfile =
    profileQuery.isError &&
    "response" in (profileQuery.error ?? {}) &&
    (profileQuery.error as { response?: { status?: number } }).response
      ?.status === 404;

  return {
    profileQuery,
    profile: profileQuery.data,
    missingProfile,
    applyMutation,
    actionError,
    setActionError,
  };
}
