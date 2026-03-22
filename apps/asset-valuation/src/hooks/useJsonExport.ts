import { useCallback } from 'react';
import type { Asset, CaseData } from '@/types';
import { downloadJsonFile } from '@/utils/fileDownload';

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
      downloadJsonFile(data, `${caseName || '案件データ'}.json`);
    },
    []
  );

  return { exportCase };
}
