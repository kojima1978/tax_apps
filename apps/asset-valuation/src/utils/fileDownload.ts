import type { Asset, CaseData } from '@/domain/types';
import { CASE_JSON_VERSION } from '@/domain/types';
import { exportFileName } from '@/domain/exportFileName';

/** JSONデータをファイルとしてダウンロード */
export function downloadJsonFile(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 案件データをJSONファイルとしてエクスポート */
export function exportCaseJson(
  caseName: string,
  taxDate: string,
  assets: Asset[],
  /** 入れ替えたカテゴリ順（標準順のままなら省略） */
  categoryOrder?: string[]
): void {
  const data: CaseData = {
    version: CASE_JSON_VERSION,
    exportedAt: new Date().toISOString(),
    caseName,
    taxDate,
    assets,
    ...(categoryOrder?.length ? { categoryOrder } : {}),
  };
  downloadJsonFile(data, exportFileName(caseName || '案件データ', 'json'));
}
