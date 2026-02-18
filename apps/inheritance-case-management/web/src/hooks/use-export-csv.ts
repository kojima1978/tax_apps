"use client";

import { useState } from "react";
import { getAllCases } from "@/lib/api/cases";
import { exportCasesToCSV } from "@/lib/export-csv";

export function useExportCSV() {
  const [isExporting, setIsExporting] = useState(false);

  const exportCSV = async () => {
    setIsExporting(true);

    try {
      const allCases = await getAllCases();
      exportCasesToCSV(allCases);
    } catch (e) {
      console.error("CSV export failed:", e);
    } finally {
      setIsExporting(false);
    }
  };

  return { exportCSV, isExporting };
}
