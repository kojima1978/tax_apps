"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider, MutationCache, QueryCache } from "@tanstack/react-query";
import { ToastProvider, useToast } from "./ui/Toast";

function QueryClientWrapper({ children }: { children: React.ReactNode }) {
  const toast = useToast();

  const [queryClient] = useState(() => new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "データの取得に失敗しました");
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "操作に失敗しました");
      },
      onSuccess: () => {
        toast.success("保存しました");
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // 1 minute
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <QueryClientWrapper>{children}</QueryClientWrapper>
    </ToastProvider>
  );
}
