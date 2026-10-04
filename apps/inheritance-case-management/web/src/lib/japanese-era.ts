/** 日本の元号定義（明治以降） */
export interface JapaneseEra {
  code: 'reiwa' | 'heisei' | 'showa' | 'taisho' | 'meiji';
  label: string;       // 表示用（令和・平成・昭和・大正・明治）
  initial: string;     // 1文字の略号（R・H・S・T・M）。CSVや手書きの「R4.1.21」を読むのに使う
  startYear: number;   // 元年の西暦
  startDate: string;   // YYYY-MM-DD（元号開始日）
  endDate?: string;    // YYYY-MM-DD（元号終了日、現行元号は undefined）
}

export const JAPANESE_ERAS: JapaneseEra[] = [
  { code: 'reiwa',  label: '令和', initial: 'R', startYear: 2019, startDate: '2019-05-01' },
  { code: 'heisei', label: '平成', initial: 'H', startYear: 1989, startDate: '1989-01-08', endDate: '2019-04-30' },
  { code: 'showa',  label: '昭和', initial: 'S', startYear: 1926, startDate: '1926-12-25', endDate: '1989-01-07' },
  { code: 'taisho', label: '大正', initial: 'T', startYear: 1912, startDate: '1912-07-30', endDate: '1926-12-24' },
  { code: 'meiji',  label: '明治', initial: 'M', startYear: 1868, startDate: '1868-10-23', endDate: '1912-07-29' },
];

/**
 * その元号で入れられる元号年の上限（現行元号は undefined = 上限なし）。
 * 画面の入力欄の max に使う。
 */
export function eraLastYear(eraCode: JapaneseEra['code']): number | undefined {
  const era = JAPANESE_ERAS.find(e => e.code === eraCode);
  if (!era?.endDate) return undefined;
  return Number(era.endDate.slice(0, 4)) - era.startYear + 1;
}

/** 実在する日付のときだけ YYYY-MM-DD を返す（2月31日・13月などは null） */
function toIsoDate(year: number, month: number, day: number): string | null {
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Date.UTC は 2桁の年を 1900 年代へ読み替えるので setUTCFullYear で組む
  const dt = new Date(0);
  dt.setUTCFullYear(year, month - 1, day);
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * 実在する日付の `YYYY-MM-DD` か。
 *
 * 形だけを正規表現で見ると `2026-02-31` が通ってしまう ── 検証もDBも素通りして、
 * 日付として読んだ瞬間に3月3日へ化ける値が残る。保存する前に必ずここを通す。
 */
export function isRealIsoDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m !== null && toIsoDate(Number(m[1]), Number(m[2]), Number(m[3])) === value;
}

/**
 * 「R」「令」「令和」のような元号の書き方から元号コードを引く（CSV取込・手入力用）。
 * 対応表を別に持つと元号を足したとき片方だけ古いまま残るので、JAPANESE_ERAS から作る。
 */
export function eraCodeFromText(text: string): JapaneseEra['code'] | undefined {
  const key = text.trim();
  const era = JAPANESE_ERAS.find(
    e => key === e.code || key === e.label || key === e.label.slice(0, 1) || key.toUpperCase() === e.initial
  );
  return era?.code;
}

/**
 * 元号の書き方を並べた正規表現の断片（`令和|令|R|平成|…`）。
 * 長い書き方を先に置く（`令` が先だと `令和4.1.21` の「和」が余る）。
 */
export const ERA_TEXT_PATTERN = JAPANESE_ERAS
  .flatMap(e => [e.label, e.label.slice(0, 1), e.initial])
  .join('|');

/** 元号の開始日・終了日を「31年4月30日」の形に（元年は「元」） */
function eraDateLabel(era: JapaneseEra, date: string): string {
  const [yyyy, mm, dd] = date.split('-').map(Number);
  const eraYear = yyyy - era.startYear + 1;
  return `${eraYear === 1 ? '元' : eraYear}年${mm}月${dd}日`;
}

/** 西暦の YYYY-MM-DD から該当する元号と元号年を返す */
export function gregorianToWareki(value: string): { era: JapaneseEra; eraYear: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [yyyy, mm, dd] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (toIsoDate(yyyy, mm, dd) !== value) return null;
  const era = JAPANESE_ERAS.find(e => value >= e.startDate && (!e.endDate || value <= e.endDate));
  if (!era) return null;
  return { era, eraYear: yyyy - era.startYear + 1, month: mm, day: dd };
}

/** 和暦→西暦の変換結果。失敗したときは画面に出す理由を持たせる */
export type WarekiConversion =
  | { ok: true; value: string }
  | { ok: false; reason: string };

/**
 * 元号 + 元号年 + 月 + 日 → YYYY-MM-DD。
 * 「日付を組む → 実在するか → 元号の範囲内か」の3段で見る。
 * 範囲は元号定義の startDate / endDate から出すので、平成31年5月1日のような
 * 改元日の1日またぎも弾ける。
 */
export function convertWareki(
  eraCode: JapaneseEra['code'],
  eraYear: number,
  month: number,
  day: number
): WarekiConversion {
  const era = JAPANESE_ERAS.find(e => e.code === eraCode);
  if (!era) return { ok: false, reason: '元号を選んでください' };
  if (!Number.isInteger(eraYear) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return { ok: false, reason: '年月日は整数で入れてください' };
  }
  if (eraYear < 1) return { ok: false, reason: '年は1以上で入れてください' };

  // 元号年の上限を先に見る（西暦が4桁を超えると「実在しない日付」に見えてしまうため）
  const maxEraYear = eraLastYear(eraCode) ?? 9999 - era.startYear + 1;
  if (eraYear > maxEraYear) {
    return {
      ok: false,
      reason: era.endDate
        ? `${era.label}は${eraDateLabel(era, era.endDate)}までです`
        : `${era.label}${maxEraYear}年より後は入れられません`,
    };
  }

  const value = toIsoDate(era.startYear + eraYear - 1, month, day);
  if (!value) return { ok: false, reason: `${month}月${day}日はありません` };

  if (value < era.startDate) {
    return { ok: false, reason: `${era.label}は${eraDateLabel(era, era.startDate)}からです` };
  }
  if (era.endDate && value > era.endDate) {
    return { ok: false, reason: `${era.label}は${eraDateLabel(era, era.endDate)}までです` };
  }
  return { ok: true, value };
}

/** 元号 + 元号年 + 月 + 日 → YYYY-MM-DD（範囲外・存在しない日付は null） */
export function warekiToGregorian(eraCode: JapaneseEra['code'], eraYear: number, month: number, day: number): string | null {
  const result = convertWareki(eraCode, eraYear, month, day);
  return result.ok ? result.value : null;
}

/** YYYY-MM-DD を「令和7年5月3日」形式に整形（不正値は空文字） */
export function formatWareki(value: string | null | undefined): string {
  if (!value) return '';
  const w = gregorianToWareki(value);
  if (!w) return '';
  return `${w.era.label}${w.eraYear}年${w.month}月${w.day}日`;
}
