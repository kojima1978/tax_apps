import { useCallback } from 'react';
import type { Asset, CaseData } from '@/types';
import { downloadJsonFile } from '@/utils/fileDownload';
import { validateCaseData } from '@/utils/validators';

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

  const importCase = useCallback(async (file: File): Promise<CaseData> => {
    const text = await file.text();
    const data: unknown = JSON.parse(text);
    return validateCaseData(data);
  }, []);

  return { exportCase, importCase };
}
