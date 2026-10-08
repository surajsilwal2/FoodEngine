"use client";

import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface DriverProfile {
  id: number;
  licenseNumber: string;
  vehicleDetails: string;
  isApproved: boolean;
  isOnline: boolean;
  user: { name: string; email: string };
}

export interface DriverApplicationForm {
  licenseNumber: string;
  vehicleDetails: string;
}

export const DRIVER_PROFILE_QUERY_KEY = ["driver-profile", "me"];

// A missing profile means the customer has not applied yet, matching the merchant application API.
export function useMyDriverApplication(enabled = true) {
  return useQuery<DriverProfile | null>({
    queryKey: DRIVER_PROFILE_QUERY_KEY,
    queryFn: async () => {
      try {
        return (await api.get<DriverProfile>("/driver/me")).data;
      } catch (error: unknown) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    enabled,
    retry: false,
  });
}

// The backend creates a pending driver profile; system-admin approval remains a separate review step.
export function useSubmitDriverApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DriverApplicationForm) =>
      (await api.post<DriverProfile>("/driver/apply", payload)).data,
    onSuccess: (profile) => {
      queryClient.setQueryData(DRIVER_PROFILE_QUERY_KEY, profile);
    },
  });
}