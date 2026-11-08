/**
 * 取込の確認（Step 3 の「取込の確認」一覧と、行の「取込」「要確認」の印）。
 *
 * 台帳 PDF などから自動で入った行（source を持つ行）を、人が確かめ終えるまで目立たせる。
 * 確認済み（review.confirmed）にするのは、その行を画面で直したとき・「確認済み」を押したとき。
 * 画面の表示だけに使い、Excel・印刷には出さない。
 */
import { CATEGORY_CONFIG } from './types.js';
import type { AssetInput, AssetSource } from './types.js';

/** 行に付ける印: attention=要確認（赤）・pending=取込の未確認（紫）・null=印なし */
export type ReviewMark = 'attention' | 'pending' | null;

/** 確認がまだ要る取込の行か */
function isPending(asset: AssetInput): boolean {
  return !!asset.source && !asset.review?.confirmed;
}

/** 読み取りに自信が無い、または取込時の注意がある */
function needsAttention(asset: AssetInput): boolean {
  return !!asset.source?.uncertain || (asset.review?.warnings?.length ?? 0) > 0;
}

export function reviewMark(asset: AssetInput): ReviewMark {
  if (!isPending(asset)) return null;
  return needsAttention(asset) ? 'attention' : 'pending';
}

/** 取込元の説明（ツールチップ用）: 「台帳.pdf 3ページ ／ 3頁 12行目」 */
export function describeSource(source: AssetSource): string {
  const where = source.page ? `${source.file} ${source.page}ページ` : source.file;
  return source.note ? `${where} ／ ${source.note}` : where;
}

/** 行の印のツールチップ（取込元・読み取りの注意・取込時の注意） */
export function reviewTooltip(asset: AssetInput): string {
  if (!asset.source) return '';
  const lines = [`取込元: ${describeSource(asset.source)}`];
  if (asset.source.uncertain) lines.push('読み取りに自信がありません。台帳と見比べてください');
  for (const w of asset.review?.warnings ?? []) lines.push(`・${w}`);
  lines.push(asset.review?.confirmed ? '確認済み' : '直すか「確認済み」を押すと印が消えます');
  return lines.join('\n');
}

/** 評価に要るのに入っていない値（取込の行かどうかを問わない） */
export function missingFields(asset: AssetInput): string[] {
  const missing: string[] = [];
  if (!asset.name.trim()) missing.push('資産名称');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asset.acquisitionDate)) missing.push('取得年月日');
  if (asset.acquisitionCost <= 0) missing.push('取得価額');
  const { valuationMethod } = CATEGORY_CONFIG[asset.category];
  if (asset.usefulLife === 0 && (valuationMethod === 'building' || valuationMethod === 'decliningBalance')) {
    missing.push('耐用年数');
  }
  return missing;
}

export interface ReviewGroups<T extends AssetInput> {
  /** 読み取りに自信が無い・取込時の注意がある（未確認） */
  attention: T[];
  /** 建物・建物附属設備: 賃貸か・固定資産税評価明細があるかは台帳から分からない（未確認） */
  building: T[];
  /** そのほかの自動で入った行（未確認） */
  other: T[];
  /** 必須の値が無い行（取込に限らない） */
  missing: { asset: T; fields: string[] }[];
  /** 未確認の取込の行の数 */
  pendingCount: number;
  /** 取込の行が1つでもあるか（一覧を出すかどうか） */
  hasIntake: boolean;
}

/** 取込の確認の一覧を組む。1行は attention → building → other のどれか1つにだけ入る */
export function buildReviewGroups<T extends AssetInput>(assets: readonly T[]): ReviewGroups<T> {
  const groups: ReviewGroups<T> = {
    attention: [],
    building: [],
    other: [],
    missing: [],
    pendingCount: 0,
    hasIntake: false,
  };
  for (const asset of assets) {
    if (asset.source) groups.hasIntake = true;
    const fields = missingFields(asset);
    if (fields.length) groups.missing.push({ asset, fields });
    if (!isPending(asset)) continue;
    groups.pendingCount += 1;
    if (needsAttention(asset)) groups.attention.push(asset);
    else if (CATEGORY_CONFIG[asset.category].hasRental) groups.building.push(asset);
    else groups.other.push(asset);
  }
  return groups;
}
