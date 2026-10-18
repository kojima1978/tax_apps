"use client";

import { useState } from "react";
import { getAllCases } from "@/lib/api/cases";
import type { CasesQueryParams } from "@/lib/api/cases";
import { todayIsoDate } from "@/lib/date-utils";

export function useExportCSV() {
  const [isExporting, setIsExporting] = useState(false);

  const exportCSV = async (filterParams?: CasesQueryParams) => {
    setIsExporting(true);

    try {
      const filters = { ...filterParams };
      delete filters.page;
      delete filters.pageSize;
      const hasFilters = Object.values(filters).some((v) => v !== undefined);
      const [allCases, { exportCasesToCSV }] = await Promise.all([
        getAllCases(hasFilters ? filters : undefined),
        import("@/lib/export-csv"),
      ]);
      const filename = hasFilters
        ? `案件一覧_フィルタ済_${todayIsoDate()}.csv`
        : undefined;
      exportCasesToCSV(allCases, filename);
    } catch (e) {
      console.error("CSV export failed:", e);
    } finally {
      setIsExporting(false);
    }
  };

  return { exportCSV, isExporting };
}
