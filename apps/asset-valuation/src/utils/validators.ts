import type { Asset, CaseData } from '@/types';

export interface ValidationResult {
  type: 'error' | 'warning';
  field: string;
  message: string;
  assetId: string;
}

export function validateAsset(asset: Asset): ValidationResult[] {
  const results: ValidationResult[] = [];

  if (asset.usefulLife < 2 || asset.usefulLife > 50) {
    results.push({
      type: 'error',
      field: 'usefulLife',
      message: `耐用年数が範囲外です（2〜50）: ${asset.usefulLife}`,
      assetId: asset.id,
    });
  }

  if (asset.acquisitionCost <= 0) {
    results.push({
      type: 'error',
      field: 'acquisitionCost',
      message: '取得価額が0以下です',
      assetId: asset.id,
    });
  }

  if (asset.elapsedYears < 0) {
    results.push({
      type: 'warning',
      field: 'acquisitionDate',
      message: '取得年月が課税時期より未来です',
      assetId: asset.id,
    });
  }

  if (
    asset.elapsedYears > asset.usefulLife * 2 &&
    asset.bookValue > asset.acquisitionCost * 0.1
  ) {
    results.push({
      type: 'warning',
      field: 'bookValue',
      message: '経過年数が耐用年数の2倍超ですが簿価が大きいです',
      assetId: asset.id,
    });
  }

  return results;
}

export function validateAllAssets(assets: Asset[]): ValidationResult[] {
  return assets.flatMap(validateAsset);
}

export function hasErrors(results: ValidationResult[]): boolean {
  return results.some((r) => r.type === 'error');
}

/** 案件JSONデータのバリデーション */
export function validateCaseData(data: unknown): CaseData {
  const obj = data as Record<string, unknown>;
  if (
    !obj ||
    typeof obj !== 'object' ||
    !obj.caseName ||
    !obj.taxDate ||
    !Array.isArray(obj.assets)
  ) {
    throw new Error('不正な案件JSONです');
  }
  return obj as unknown as CaseData;
}
