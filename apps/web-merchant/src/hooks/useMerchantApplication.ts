"use client";

import { api } from "@/lib/api";
import {
  type MerchantApplication,
  type MerchantApplicationForm,
} from "@/types/tenant";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MY_TENANTS_QUERY_KEY } from "./useMyTenants";

// One shared cache key so the query and the mutation can never drift apart.
export const MERCHANT_APPLICATION_QUERY_KEY = ["merchant-application", "me"];

/**
 * The signed-in user's application. The API returns `null` when they have never
 * applied, so callers treat null as "no application".
 */
export function useMyMerchantApplication(enabled = true) {
  return useQuery<MerchantApplication | null>({
    queryKey: MERCHANT_APPLICATION_QUERY_KEY,
    queryFn: async () => (await api.get("/tenant/applications/me")).data,
    enabled,
  });
}

/** Creates the application, or resubmits one that was rejected. */
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
      // The API echoes the saved application, so seed the cache and let the
      // access hook recompute which screen the merchant should be on.
      queryClient.setQueryData(MERCHANT_APPLICATION_QUERY_KEY, data);
      void queryClient.invalidateQueries({ queryKey: MY_TENANTS_QUERY_KEY });
    },
  });
}
