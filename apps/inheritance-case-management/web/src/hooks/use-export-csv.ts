"use client";

import { useState } from "react";
import { getAllCases } from "@/lib/api/cases";
import { exportCasesToCSV } from "@/lib/export-csv";

export function useExportCSV() {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportCSV = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const allCases = await getAllCases();
      exportCasesToCSV(allCases);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エクスポートに失敗しました");
      console.error("CSV export failed:", e);
    } finally {
      setIsExporting(false);
    }
  };

  return { exportCSV, isExporting, error };
}
