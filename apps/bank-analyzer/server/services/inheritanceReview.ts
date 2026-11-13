// 相続税の検討（依頼22）を、案件の取引と全体の設定から組み立てる。
// 概要タブとカテゴリー別 Excel の両方がここを通る（同じ数字を出すため）。計算は lib/inheritanceReview.ts。

import type { PrismaClient } from '@prisma/client';
import { transferPairs } from '../lib/aggregate.js';
import { inheritanceReview, type InheritanceReview } from '../lib/inheritanceReview.js';
import type { ExportRow } from './exports.js';
import { getAppSettings } from './settings.js';

export async function buildInheritanceReview(db: PrismaClient, txs: readonly ExportRow[], referenceDate: string | null): Promise<InheritanceReview | null> {
  if (!referenceDate) return null;
  const settings = await getAppSettings(db);
  // 資金移動の組になった出金 = 案件の口座の間の移動（口座の外へ出たものではない）
  const pairedIds = new Set(transferPairs(txs, settings).map((p) => p.source.id));
  return inheritanceReview(txs, referenceDate, {
    preDeathMonths: settings.preDeathMonths,
    largeThreshold: settings.largeAmountThreshold,
    pairedIds,
  });
}
