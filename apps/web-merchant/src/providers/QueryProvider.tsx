"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Holds every server-data cache for the merchant app. Same defaults as the
 * customer app so behaviour (and bug reports) stay comparable.
 */
export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // data stays fresh for 5 minutes
            refetchOnWindowFocus: false, // avoid surprise refetches on tab switch
            retry: 1, // one retry is enough for a flaky connection
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
