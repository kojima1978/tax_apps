import { useCallback } from 'react';
import type { Asset, CaseData } from '@/types';

export function useJsonExport() {
  const exportCase = useCallback(
    (caseName: string, taxDate: string, assets: Asset[]) => {
      const data: CaseData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        caseName,
        taxDate,
        assets,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${caseName || '案件データ'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    []
  );

  const importCase = useCallback(
    async (file: File): Promise<CaseData> => {
      const text = await file.text();
      const data = JSON.parse(text) as CaseData;
      if (
        !data.caseName ||
        !data.taxDate ||
        !Array.isArray(data.assets)
      ) {
        throw new Error('不正な案件JSONです');
      }
      return data;
    },
    []
  );

  return { exportCase, importCase };
}
