/**
 * 案件JSONの検査・正規化。
 *
 * 画面の「案件JSONインポート」と、MCP サーバーの normalize_asset_case（台帳 PDF からの取込）が
 * 同じこの関数を通る。区分の別名・償却方法・和暦の読み方などの知識はここ（と types.ts・date.ts）
 * にだけ置き、MCP 側へは写さない。
 *
 * 方針: おかしな値でも行は落とさない。読めた形へ寄せたうえで警告を返し、
 * 取込の行（source を持つ行）には review.warnings として残して画面で「要確認」にする。
 * 弾くのは案件そのものが成り立たないとき（案件名・課税時期・資産の配列が無い）だけ。
 *
 * このファイルは DOM にも `@/` の別名にも頼らない（MCP サーバーが相対パスで import する）。
 */
import {
  CASE_JSON_VERSION,
  CATEGORY_CONFIG,
  defaultCategoryOf,
  resolveCategory,
  suggestAssetClasses,
} from './types.js';
import type { AssetInput, AssetReview, AssetSource, CaseData } from './types.js';
import { parseDate } from './date.js';
import { generateId } from './id.js';
import { exportFileName } from './exportFileName.js';

/** 案件として読めないとき（画面ではそのまま利用者へ見せる文面） */
export class CaseJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CaseJsonError';
  }
}

/** 行ごとの警告 */
export interface IntakeRowWarning {
  /** assets の何番目か（0始まり） */
  index: number;
  no: string;
  name: string;
  messages: string[];
}

/** 区分ごとの件数と合計（台帳の科目別の小計と突き合わせる用） */
export interface IntakeClassTotal {
  label: string;
  count: number;
  acquisitionCost: number;
  bookValue: number;
}

export interface IntakeResult {
  /** 正規化した案件（計算結果は含まない。画面が読み込むときに計算する） */
  caseData: CaseData & { assets: AssetInput[] };
  warnings: IntakeRowWarning[];
  totals: {
    count: number;
    acquisitionCost: number;
    bookValue: number;
    byCategory: IntakeClassTotal[];
  };
}

/** 版の比較（1.10 > 1.9 を正しく扱う） */
function newerThanSupported(version: string): boolean {
  const [maj = 0, min = 0] = version.split('.').map((p) => Number(p) || 0);
  const [sMaj = 0, sMin = 0] = CASE_JSON_VERSION.split('.').map(Number);
  return maj > sMaj || (maj === sMaj && min > sMin);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function toText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return typeof v === 'string' ? v.trim() : '';
}

/** 全角の数字・記号を半角へ */
function toHalfWidth(raw: string): string {
  return raw.replace(/[０-９．，－]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

/**
 * 金額を円の整数へ。「1,234,567」「￥1,234円」「△1,000」「(1,000)」も読む。
 * 小数は切り捨て、読めなければ 0 として警告を返す。
 */
export function parseYen(input: unknown, label: string): { value: number; warning?: string } {
  if (input === null || input === undefined || input === '') {
    return { value: 0, warning: `${label}がありません` };
  }
  let num: number;
  if (typeof input === 'number') {
    num = input;
  } else if (typeof input === 'string') {
    let s = toHalfWidth(input).replace(/[\s　,￥¥円]/g, '');
    let negative = false;
    if (/^[△▲-]/.test(s)) {
      negative = true;
      s = s.slice(1);
    } else if (/^\(.*\)$/.test(s)) {
      negative = true;
      s = s.slice(1, -1);
    }
    num = /^\d+(\.\d+)?$/.test(s) ? Number(s) * (negative ? -1 : 1) : NaN;
  } else {
    num = NaN;
  }
  if (!Number.isFinite(num)) {
    return { value: 0, warning: `${label}「${String(input)}」を金額として読めません` };
  }
  if (!Number.isInteger(num)) {
    return { value: Math.floor(num), warning: `${label}「${String(input)}」に円未満があったので切り捨てました` };
  }
  return { value: num };
}

/** 耐用年数を整数へ。「15年」「１５」も読む。 */
export function parseUsefulLife(input: unknown): { value: number; warning?: string } {
  if (input === null || input === undefined || input === '') {
    return { value: 0, warning: '耐用年数がありません' };
  }
  const s = typeof input === 'number' ? String(input) : typeof input === 'string' ? toHalfWidth(input).replace(/[\s　年]/g, '') : '';
  const num = /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
  if (!Number.isFinite(num)) {
    return { value: 0, warning: `耐用年数「${String(input)}」を読めません` };
  }
  if (!Number.isInteger(num)) {
    return { value: Math.floor(num), warning: `耐用年数「${String(input)}」に小数があったので切り捨てました` };
  }
  return { value: num };
}

function readSource(v: unknown): AssetSource | undefined {
  if (!isRecord(v)) return undefined;
  const file = toText(v.file);
  if (!file) return undefined;
  const page = typeof v.page === 'number' && Number.isInteger(v.page) && v.page > 0 ? v.page : undefined;
  const note = toText(v.note);
  return {
    file,
    ...(page !== undefined ? { page } : {}),
    ...(note ? { note } : {}),
    ...(v.uncertain === true ? { uncertain: true } : {}),
  };
}

function readReview(v: unknown): AssetReview {
  if (!isRecord(v)) return {};
  const warnings = Array.isArray(v.warnings) ? v.warnings.filter((w): w is string => typeof w === 'string' && w !== '') : [];
  return {
    ...(warnings.length ? { warnings } : {}),
    ...(v.confirmed === true ? { confirmed: true } : {}),
  };
}

/**
 * 1行を正規化する。
 * messages は取込の時点でしか分からない注意（行の review.warnings に残す）、
 * checks は値を見れば画面でも分かる注意（報告するだけ。画面は Step 3 の検証で同じものを出す）。
 */
function normalizeAsset(raw: unknown, index: number): { asset: AssetInput; messages: string[]; checks: string[] } {
  const obj = isRecord(raw) ? raw : {};
  const messages: string[] = [];
  const checks: string[] = [];
  if (!isRecord(raw)) messages.push(`${index + 1}件目が資産の形になっていません`);

  // NO は文字列のまま（枝番・先頭ゼロを保つ）。旧JSON は数値なので文字列へ
  const no = toText(obj.no);
  const name = toText(obj.name);
  if (!name) messages.push('資産名称がありません');

  // 区分: 正式名・旧カテゴリ名・別名・「区分（償却方法）」と、別欄の償却方法（method）を受ける
  const rawCategory = toText(obj.category);
  const rawMethod = toText(obj.method);
  const resolved = resolveCategory(rawCategory, rawMethod || undefined);
  let category = resolved.category;
  if (!category) {
    category = defaultCategoryOf('工具器具備品');
    const hints = suggestAssetClasses(rawCategory);
    messages.push(
      rawCategory
        ? `区分「${rawCategory}」を判定できないため工具器具備品にしました${hints.length ? `（候補: ${hints.join('・')}）` : ''}`
        : '区分が無いため工具器具備品にしました'
    );
  } else {
    if (resolved.methodRejected) {
      messages.push(`償却方法「${resolved.methodRejected}」は${CATEGORY_CONFIG[category].assetClass ?? category}では選べないため${category}にしました`);
    } else if (resolved.methodAssumed) {
      messages.push(`償却方法が分からないため${category}にしました（評価額には影響しません）`);
    }
  }
  const config = CATEGORY_CONFIG[category];

  const date = parseDate(obj.acquisitionDate);
  if (date.warning) messages.push(date.warning);

  const life = parseUsefulLife(obj.usefulLife);
  // 簿価評価・財産性なしの区分は耐用年数を使わないので、無くても注意しない
  const needsLife = config.valuationMethod === 'building' || config.valuationMethod === 'decliningBalance';
  if (life.warning && (needsLife || obj.usefulLife !== undefined)) messages.push(life.warning);
  if (needsLife && life.value === 0 && !life.warning) checks.push('耐用年数が0です');
  if (needsLife && life.value > 50) checks.push(`耐用年数 ${life.value} 年は表の範囲（50年まで）を超えています`);

  const cost = parseYen(obj.acquisitionCost, '取得価額');
  if (cost.warning) messages.push(cost.warning);
  const book = parseYen(obj.bookValue, '期末簿価');
  if (book.warning) messages.push(book.warning);
  if (!cost.warning && cost.value <= 0) checks.push('取得価額が0以下です');
  if (!book.warning && book.value < 0) checks.push('期末簿価がマイナスです');
  if (book.value > cost.value && cost.value > 0) checks.push('期末簿価が取得価額を超えています');

  // 固定資産税評価明細・賃貸はその区分で使えるときだけ立てる
  let hasFixedAssetTaxRecord = obj.hasFixedAssetTaxRecord === true;
  if (hasFixedAssetTaxRecord && !config.hasFixedAssetTaxRecord) {
    hasFixedAssetTaxRecord = false;
    messages.push(`${category}は固定資産税評価明細の対象外なので外しました`);
  }
  let isRental = obj.isRental === true;
  if (isRental && !config.hasRental) {
    isRental = false;
    messages.push(`${category}は賃貸控除の対象外なので外しました`);
  }

  const source = readSource(obj.source);
  const asset: AssetInput = {
    id: toText(obj.id) || generateId(),
    no,
    category,
    // 小計の単位はカテゴリと同じ（画面の読み込みと同じ扱い）
    categoryLabel: category,
    name,
    acquisitionDate: date.value || toText(obj.acquisitionDate),
    usefulLife: life.value,
    acquisitionCost: cost.value,
    bookValue: book.value,
    hasFixedAssetTaxRecord,
    isRental,
  };
  if (source) {
    // 取込の行だけ確認状態を持つ。読み直したときは前の注意に今回の分を足す（重複は1つ）
    const prev = readReview(obj.review);
    const warnings = Array.from(new Set([...(prev.warnings ?? []), ...messages]));
    asset.source = source;
    asset.review = {
      ...(warnings.length ? { warnings } : {}),
      ...(prev.confirmed ? { confirmed: true } : {}),
    };
  }
  return { asset, messages, checks };
}

/**
 * 資産の配列だけを正規化する（作業中の下書きの復元など、案件名・課税時期の検査が要らない経路用）。
 * ID の重複（手で行を写したとき等）は振り直す。重複したままだと画面の編集が両方に効く。
 */
export function normalizeAssets(rawAssets: readonly unknown[]): { assets: AssetInput[]; warnings: IntakeRowWarning[] } {
  const warnings: IntakeRowWarning[] = [];
  const assets = rawAssets.map((raw, index) => {
    const { asset, messages, checks } = normalizeAsset(raw, index);
    const all = [...messages, ...checks];
    if (all.length) warnings.push({ index, no: asset.no, name: asset.name, messages: all });
    return asset;
  });
  const seen = new Set<string>();
  for (const a of assets) {
    if (seen.has(a.id)) a.id = generateId();
    seen.add(a.id);
  }
  return { assets, warnings };
}

/** 読み込める案件JSONかを確かめ、各行を正規化する */
export function normalizeCaseJson(input: unknown): IntakeResult {
  if (!isRecord(input)) throw new CaseJsonError('案件JSONの形になっていません');

  const version = toText(input.version) || '1.0';
  if (newerThanSupported(version)) {
    throw new CaseJsonError(`このアプリより新しい版（${version}）の案件JSONです。アプリを更新してから読み込んでください`);
  }
  const caseName = toText(input.caseName);
  if (!caseName) throw new CaseJsonError('案件名（caseName）がありません');
  const taxDateParsed = parseDate(input.taxDate);
  if (!taxDateParsed.value) {
    throw new CaseJsonError(`課税時期（taxDate）を読めません: ${toText(input.taxDate) || '空'}`);
  }
  if (!Array.isArray(input.assets)) throw new CaseJsonError('資産の一覧（assets）がありません');

  const { assets, warnings } = normalizeAssets(input.assets);

  const categoryOrder = Array.isArray(input.categoryOrder)
    ? input.categoryOrder.filter((c): c is string => typeof c === 'string')
    : [];

  const byCategory = new Map<string, IntakeClassTotal>();
  for (const a of assets) {
    const t = byCategory.get(a.category) ?? { label: a.category, count: 0, acquisitionCost: 0, bookValue: 0 };
    t.count += 1;
    t.acquisitionCost += a.acquisitionCost;
    t.bookValue += a.bookValue;
    byCategory.set(a.category, t);
  }

  return {
    caseData: {
      version: CASE_JSON_VERSION,
      exportedAt: toText(input.exportedAt) || new Date().toISOString(),
      caseName,
      taxDate: taxDateParsed.value,
      assets,
      ...(categoryOrder.length ? { categoryOrder } : {}),
    },
    warnings,
    totals: {
      count: assets.length,
      acquisitionCost: assets.reduce((s, a) => s + a.acquisitionCost, 0),
      bookValue: assets.reduce((s, a) => s + a.bookValue, 0),
      byCategory: Array.from(byCategory.values()),
    },
  };
}

/** 取込で作った案件JSONの保存名（画面の書き出しと同じ `R0xMMDD_案件名_減価償却資産評価.json`） */
export function caseJsonFileName(caseName: string, date?: Date): string {
  return exportFileName(caseName || '案件データ', 'json', date);
}
