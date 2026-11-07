/**
 * 案件を作るのに要る欄（会社名・課税時期・直前期）の組み立て。
 *
 * 一覧に出る会社名と課税時期は案件の列ではなく第1表の1の欄から作られる
 * （株式評価明細書側の src/features/cases/caseLabels.ts が保存のたびに作り直す）。
 * そのため案件を作るときは列だけでなく欄まで埋める必要がある ── 欄を空のままにすると、
 * 画面で開いた次の自動保存で見出しが「（会社名未入力 #12）」になり、作ったはずの案件が
 * 一覧で見分けられなくなる。
 *
 * どの欄がそれかは辞書（caseIdentity）だけが決める。和暦の元号・期間もそこから来るので、
 * このファイルには様式の知識を持たせない。
 */
import type { CaseData, CatalogCaseIdentity, CatalogDateField, FieldCatalog } from './catalog.js';
import { caseIdentityOf } from './catalog.js';
import { InputError } from './errors.js';

export interface CaseProfileInput {
  companyName: string;
  taxPeriod: string;
  fiscalYearFrom?: string;
  fiscalYearTo?: string;
}

export interface CaseProfileDate {
  key: string;
  label: string;
  /** 見出しの形に直した日付（「令和8年3月31日」）。未指定なら空 */
  text: string;
}

export interface CaseProfile {
  companyName: string;
  /** 一覧に出る課税時期の見出し */
  taxPeriod: string;
  dates: CaseProfileDate[];
  /** 第1表の1 へ入れる欄（案件データに重ねる形） */
  data: CaseData;
  /** 作ったあとに人が画面で入れる必要があること */
  notes: string[];
}

const WIDE_DIGITS = /[０-９]/g;
const SPACES = /[ 　\t]/g;
/** 「令和8年3月31日」。月・日は無くてもよい（年までで作れる） */
const DATE_TEXT = /^(\D*?)(\d+|元)年(?:(\d+)月(?:(\d+)日)?)?$/;

function toHalfWidth(text: string): string {
  return text.replace(WIDE_DIGITS, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

interface DateParts {
  era: string;
  year: number;
  month: number | undefined;
  day: number | undefined;
}

/** その年月の日数。 */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

const iso = (y: number, m: number, d: number) =>
  `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function parseDateText(field: CatalogDateField, raw: string): DateParts {
  const text = toHalfWidth(String(raw)).replace(SPACES, '');
  const m = DATE_TEXT.exec(text);
  if (m === null) {
    throw new InputError(
      `${field.label}: 「${raw}」を日付として読めません。`
      + '「令和8年3月31日」の形（元号・年・月・日）で指定してください'
      + '（月日が分からないときは「令和8年」まででも作れますが、画面で入れ直しが必要です）',
    );
  }
  const yearText = m[2] === '元' ? '1' : m[2]!;
  return {
    era: m[1] ?? '',
    year: Number(yearText),
    month: m[3] === undefined ? undefined : Number(m[3]),
    day: m[4] === undefined ? undefined : Number(m[4]),
  };
}

/**
 * 元号の期間・実在する日付であることを確かめる。
 *
 * 画面のプルダウンは選べる範囲を元号に合わせて狭めているが、外から入れた値はその網をくぐる。
 * 「平成40年」「令和1年1月1日」が黙って入ると、課税時期から決まる会社規模の判定も
 * 日付の前後関係の確認も結果が変わるので、ここで弾く。
 */
function validate(identity: CatalogCaseIdentity, field: CatalogDateField, parts: DateParts): string {
  const names = identity.eras.map((e) => e.name);
  const name = parts.era === '' ? identity.defaultEra : parts.era;
  const era = identity.eras.find((e) => e.name === name);
  if (era === undefined) {
    throw new InputError(`${field.label}: 「${name}」は選べる元号にありません（${names.join(' / ')}）`);
  }

  if (parts.year < 1 || parts.year > era.lastYear) {
    throw new InputError(`${field.label}: ${name}に${parts.year}年はありません（1〜${era.lastYear}年）`);
  }
  const western = era.base + parts.year;

  if (parts.month !== undefined && (parts.month < 1 || parts.month > 12)) {
    throw new InputError(`${field.label}: ${parts.month}月はありません`);
  }
  if (parts.day !== undefined) {
    if (parts.month === undefined) throw new InputError(`${field.label}: 日だけでは日付になりません`);
    const last = daysInMonth(western, parts.month);
    if (parts.day < 1 || parts.day > last) {
      throw new InputError(
        `${field.label}: ${name}${parts.year}年${parts.month}月に${parts.day}日はありません（${last}日まで）`,
      );
    }
  }

  // 月日が分かっていないぶんは幅で見る（年だけなら その年の1月1日〜12月31日）
  const lower = iso(western, parts.month ?? 1, parts.day ?? 1);
  const upper = iso(western, parts.month ?? 12, parts.day ?? daysInMonth(western, parts.month ?? 12));
  if (upper < era.start || (era.end !== undefined && lower > era.end)) {
    const until = era.end === undefined ? '' : `〜${era.end}`;
    const month = parts.month === undefined ? '' : `${parts.month}月`;
    throw new InputError(
      `${field.label}: ${name}${parts.year}年${month}は${name}の期間（${era.start}${until}）の外です。`
      + '改元をまたぐ日付は元号を確かめてください',
    );
  }
  return name;
}

function partValue(part: string, era: string, parts: DateParts): string {
  if (part === 'era') return era;
  if (part === 'year') return String(parts.year);
  if (part === 'month') return parts.month === undefined ? '' : String(parts.month);
  if (part === 'day') return parts.day === undefined ? '' : String(parts.day);
  throw new InputError(`辞書に知らない日付の部分があります（${part}）。株式評価明細書を作り直してください`);
}

/**
 * 一覧に出る見出し。元号＋年から始め、空の欄が出たらそこで止める
 * （月が空なら日は出さない ── caseLabels.ts の taxPeriodLabel と同じ規則）。
 */
function dateLabel(identity: CatalogCaseIdentity, values: Record<string, string>): string {
  const out: string[] = [];
  for (const part of identity.parts) {
    const value = values[part.keySuffix] ?? '';
    if (part.part === 'era') {
      out.push(value === '' ? identity.defaultEra : value);
      continue;
    }
    if (value === '') break;
    out.push(`${value}${part.labelSuffix}`);
  }
  return out.join('');
}

/**
 * 入力から「案件の列」と「第1表の1 の欄」の両方を組み立てる。
 * 何も書かずに返すので、試算（commit なし）でもそのまま見せられる。
 */
export function buildCaseProfile(catalog: FieldCatalog, input: CaseProfileInput): CaseProfile {
  const identity = caseIdentityOf(catalog);

  const companyName = String(input.companyName ?? '').trim();
  if (companyName === '') throw new InputError('会社名が空です。決算書の表紙どおりに指定してください');

  const given: Record<string, string> = { taxPeriod: String(input.taxPeriod ?? '').trim() };
  if (input.fiscalYearFrom !== undefined) given.fiscalYearFrom = String(input.fiscalYearFrom).trim();
  if (input.fiscalYearTo !== undefined) given.fiscalYearTo = String(input.fiscalYearTo).trim();

  const table: Record<string, string> = { [identity.companyName.field]: companyName };
  const dates: CaseProfileDate[] = [];
  const notes: string[] = [];
  const bounds: Record<string, string> = {};

  for (const field of identity.dates) {
    const raw = given[field.key] ?? '';
    if (raw === '') {
      if (field.required) {
        throw new InputError(`${field.label}が空です。一覧で案件を見分けられないので必ず指定してください`);
      }
      dates.push({ key: field.key, label: field.label, text: '' });
      notes.push(`${field.label}は空のままです（画面で入れてください）`);
      continue;
    }

    const parts = parseDateText(field, raw);
    const era = validate(identity, field, parts);
    const values: Record<string, string> = {};
    for (const part of identity.parts) {
      const value = partValue(part.part, era, parts);
      values[part.keySuffix] = value;
      table[`${field.prefix}${part.keySuffix}`] = value;
    }
    dates.push({ key: field.key, label: field.label, text: dateLabel(identity, values) });
    if (parts.month === undefined || parts.day === undefined) {
      notes.push(`${field.label}の月日が入っていません（${raw}）。計算に使うので画面で入れてください`);
    }
    const base = identity.eras.find((e) => e.name === era)!.base;
    bounds[field.key] = iso(base + parts.year, parts.month ?? 1, parts.day ?? 1);
  }

  // 自と至の取り違えは数字が全部ずれるので、分かる範囲で止める
  const from = bounds.fiscalYearFrom;
  const to = bounds.fiscalYearTo;
  if (from !== undefined && to !== undefined && from > to) {
    throw new InputError('直前期の「自」が「至」より後になっています。入れ違っていないか確かめてください');
  }

  const required = identity.dates.find((f) => f.required);
  const taxPeriod = dates.find((d) => d.key === required?.key)?.text ?? '';
  return { companyName, taxPeriod, dates, data: { [identity.table]: table }, notes };
}
