"use client";

import { useQuery } from "@tanstack/react-query";
import { getCaseKpis, getCaseList, type CasesQueryParams } from "@/lib/api/cases";

export const CASES_QUERY_KEY = ["cases"];
export const CASE_KPI_QUERY_KEY = ["case-kpis"];

export function useCases(params?: CasesQueryParams) {
  return useQuery({
    queryKey: [...CASES_QUERY_KEY, params],
    queryFn: () => getCaseList(params),
  });
}

export function useCaseKpis(params?: CasesQueryParams) {
  return useQuery({
    queryKey: [...CASE_KPI_QUERY_KEY, params],
    queryFn: () => getCaseKpis(params),
  });
}
