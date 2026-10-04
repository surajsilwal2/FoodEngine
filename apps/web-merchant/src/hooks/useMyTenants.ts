"use client";

import { api } from "@/lib/api";
import type { TenantMembership } from "@/types/tenant";
import { useQuery } from "@tanstack/react-query";

export const MY_TENANTS_QUERY_KEY = ["my-tenants"];

/** The workspaces (tenants) the signed-in user belongs to, with their role. */
export function useMyTenants(enabled = true) {
  return useQuery<TenantMembership[]>({
    queryKey: MY_TENANTS_QUERY_KEY,
    queryFn: async () => (await api.get("/tenant/my-tenant")).data,
    enabled,
  });
}
