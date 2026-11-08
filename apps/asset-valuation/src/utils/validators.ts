import type { Asset } from '@/domain/types';
import { CATEGORY_CONFIG } from '@/domain/types';

export interface ValidationResult {
  type: 'error' | 'warning';
  field: string;
  message: string;
  assetId: string;
}

export function validateAsset(asset: Asset): ValidationResult[] {
  const results: ValidationResult[] = [];

  if (asset.usefulLife < 0 || asset.usefulLife > 50) {
    results.push({
      type: 'error',
      field: 'usefulLife',
      message: `耐用年数が範囲外です（0〜50）: ${asset.usefulLife}`,
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

  if (!/^\d{4}-\d{2}-\d{2}$/.test(asset.acquisitionDate)) {
    results.push({
      type: 'error',
      field: 'acquisitionDate',
      message: asset.acquisitionDate
        ? `取得年月日「${asset.acquisitionDate}」を日付として読めません`
        : '取得年月日がありません',
      assetId: asset.id,
    });
  }

  const { valuationMethod } = CATEGORY_CONFIG[asset.category];
  if (asset.usefulLife === 0 && (valuationMethod === 'building' || valuationMethod === 'decliningBalance')) {
    results.push({
      type: 'warning',
      field: 'usefulLife',
      message: '耐用年数が0です（未入力の可能性）',
      assetId: asset.id,
    });
  }

  if (asset.acquisitionCost > 0 && asset.bookValue > asset.acquisitionCost) {
    results.push({
      type: 'warning',
      field: 'bookValue',
      message: '期末簿価が取得価額を超えています',
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
