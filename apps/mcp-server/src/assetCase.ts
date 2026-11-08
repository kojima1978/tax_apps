/**
 * 減価償却資産評価（asset-valuation）の案件JSONを検査・正規化する道具の中身。
 *
 * 固定資産台帳 PDF を AI が読んで作った下書きを受け取り、アプリが読み込むときと
 * **同じ関数**（asset-valuation の src/domain）で正規化して返す。知識の写しはここに持たない ──
 * 写すと、アプリ側の別名や和暦の読み方を直したとき片方だけ古いまま黙って動く。
 *
 * ファイルは書かない。保存は AI が PDF の隣へ行う（手順は apps/asset-valuation/INTAKE.md）。
 * サーバも DB も要らないので、株式評価明細書の API が落ちていても使える。
 */
import { CaseJsonError, caseJsonFileName, normalizeCaseJson } from '../../asset-valuation/src/domain/intake.js';
import { buildReviewGroups, describeSource } from '../../asset-valuation/src/domain/review.js';
import type { AssetInput } from '../../asset-valuation/src/domain/types.js';
import { InputError } from './errors.js';

export interface NormalizeAssetCaseArgs {
  case: unknown;
}

/** 報告に並べる1行（人が台帳と見比べられる最小限） */
function rowLabel(asset: AssetInput) {
  return {
    no: asset.no,
    name: asset.name,
    category: asset.category,
    ...(asset.source ? { source: describeSource(asset.source) } : {}),
  };
}

/**
 * 案件JSONの下書きを正規化して、保存名・合計・確かめてほしい行と一緒に返す。
 * 案件として成り立たない（案件名・課税時期・assets が無い）ときだけ InputError。
 * おかしな行は落とさず、warnings と review.attention に出す。
 */
export function normalizeAssetCase(args: NormalizeAssetCaseArgs, today: Date = new Date()): string {
  let result;
  try {
    result = normalizeCaseJson(args.case);
  } catch (error) {
    if (error instanceof CaseJsonError) throw new InputError(error.message);
    throw error;
  }
  const { caseData, warnings, totals } = result;
  const groups = buildReviewGroups(caseData.assets);

  const report = {
    fileName: caseJsonFileName(caseData.caseName, today),
    totals,
    warnings,
    review: {
      attention: groups.attention.map((a) => ({
        ...rowLabel(a),
        reasons: [
          ...(a.source?.uncertain ? ['読み取りに自信が無い（uncertain）'] : []),
          ...(a.review?.warnings ?? []),
        ],
      })),
      building: groups.building.map(rowLabel),
      missing: groups.missing.map(({ asset, fields }) => ({ ...rowLabel(asset), fields })),
      otherCount: groups.other.length,
    },
    note:
      'totals を台帳の頁計・合計と突き合わせ、合えば caseJson を PDF と同じフォルダへ fileName で保存すること'
      + '（同名があれば上書きせず人に聞く）。building の行は賃貸の有無と固定資産税の評価明細の有無を人に確かめる。',
    caseJson: caseData,
  };
  return JSON.stringify(report, null, 2);
}
