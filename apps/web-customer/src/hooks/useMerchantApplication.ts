"use client";

import { api } from "@/lib/api";
import {
  type MerchantApplication,
  type MerchantApplicationForm,
} from "@/types/tenant";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// One shared cache key so the query and the mutation below can never drift.
export const MERCHANT_APPLICATION_QUERY_KEY = ["merchant-application", "me"];

/**
 * The signed-in customer's merchant application. The API returns `null` when
 * the user has never applied, so the caller treats null as "no application".
 */
export function useMyMerchantApplication(enabled = true) {
  return useQuery<MerchantApplication | null>({
    queryKey: MERCHANT_APPLICATION_QUERY_KEY,
    queryFn: async () => (await api.get("/tenant/applications/me")).data,
    enabled,
  });
}

/** Creates a merchant application, or resubmits one that was rejected. */
export function useSubmitMerchantApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: MerchantApplicationForm) => {
      const { data } = await api.post<MerchantApplication>(
        "/tenant/applications",
        payload,
      );
      return data;
    },
    onSuccess: (data) => {
      // The API echoes the saved application, so seed the cache directly
      // instead of paying for an extra refetch.
      queryClient.setQueryData(MERCHANT_APPLICATION_QUERY_KEY, data);
    },
  });
}
