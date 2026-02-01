"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCases,
  getCase,
  createCase,
  updateCase,
  deleteCase,
  type CasesQueryParams,
} from "@/lib/api/cases";
import type { InheritanceCase, PaginatedResponse } from "@tax-apps/shared";
import type { CreateCaseInput, UpdateCaseInput } from "@tax-apps/validation";

export const CASES_QUERY_KEY = ["cases"];

export function useCases(params?: CasesQueryParams) {
  return useQuery({
    queryKey: [...CASES_QUERY_KEY, params],
    queryFn: () => getCases(params),
  });
}

export function useCase(id: string) {
  return useQuery({
    queryKey: [...CASES_QUERY_KEY, id],
    queryFn: () => getCase(id),
    enabled: !!id,
  });
}

export function useCreateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateCaseInput) => createCase(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CASES_QUERY_KEY });
    },
  });
}

export function useUpdateCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCaseInput }) =>
      updateCase(id, data),
    onSuccess: (updatedCase, variables) => {
      // Update individual case cache directly
      queryClient.setQueryData<InheritanceCase | null>(
        [...CASES_QUERY_KEY, variables.id],
        updatedCase
      );

      // Update case in paginated list caches
      queryClient.setQueriesData<PaginatedResponse<InheritanceCase>>(
        { queryKey: CASES_QUERY_KEY },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: oldData.data.map((c) =>
              c.id === variables.id ? updatedCase : c
            ),
          };
        }
      );
    },
  });
}

export function useDeleteCase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteCase(id),
    onSuccess: (_, deletedId) => {
      // Remove from individual cache
      queryClient.removeQueries({ queryKey: [...CASES_QUERY_KEY, deletedId] });

      // Remove from paginated list caches and update totals
      queryClient.setQueriesData<PaginatedResponse<InheritanceCase>>(
        { queryKey: CASES_QUERY_KEY },
        (oldData) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            data: oldData.data.filter((c) => c.id !== deletedId),
            pagination: {
              ...oldData.pagination,
              total: oldData.pagination.total - 1,
            },
          };
        }
      );
    },
  });
}
