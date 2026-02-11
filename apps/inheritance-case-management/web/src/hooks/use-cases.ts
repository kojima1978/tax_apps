"use client";

import { useQuery } from "@tanstack/react-query";
import { getCases, type CasesQueryParams } from "@/lib/api/cases";

const CASES_QUERY_KEY = ["cases"];

export function useCases(params?: CasesQueryParams) {
  return useQuery({
    queryKey: [...CASES_QUERY_KEY, params],
    queryFn: () => getCases(params),
  });
}
