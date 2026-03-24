import type { Asset, CaseData } from '@/types';

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
export function exportCaseJson(caseName: string, taxDate: string, assets: Asset[]): void {
  const data: CaseData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    caseName,
    taxDate,
    assets,
  };
  downloadJsonFile(data, `${caseName || '案件データ'}.json`);
}
