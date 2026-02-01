"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getReferrers,
  createReferrer,
  updateReferrer,
  deleteReferrer,
} from "@/lib/api/referrers";
import type { CreateReferrerInput, UpdateReferrerInput } from "@tax-apps/validation";

export const REFERRERS_QUERY_KEY = ["referrers"];

export function useReferrers() {
  return useQuery({
    queryKey: REFERRERS_QUERY_KEY,
    queryFn: getReferrers,
  });
}

export function useCreateReferrer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateReferrerInput) => createReferrer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERRERS_QUERY_KEY });
    },
  });
}

export function useUpdateReferrer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateReferrerInput }) =>
      updateReferrer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERRERS_QUERY_KEY });
    },
  });
}

export function useDeleteReferrer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteReferrer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: REFERRERS_QUERY_KEY });
    },
  });
}
