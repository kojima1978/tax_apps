"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAssignees,
  createAssignee,
  updateAssignee,
  deleteAssignee,
} from "@/lib/api/assignees";
import type { CreateAssigneeInput, UpdateAssigneeInput } from "@tax-apps/validation";

export const ASSIGNEES_QUERY_KEY = ["assignees"];

export function useAssignees() {
  return useQuery({
    queryKey: ASSIGNEES_QUERY_KEY,
    queryFn: getAssignees,
  });
}

export function useCreateAssignee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAssigneeInput) => createAssignee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSIGNEES_QUERY_KEY });
    },
  });
}

export function useUpdateAssignee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAssigneeInput }) =>
      updateAssignee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSIGNEES_QUERY_KEY });
    },
  });
}

export function useDeleteAssignee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteAssignee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ASSIGNEES_QUERY_KEY });
    },
  });
}
