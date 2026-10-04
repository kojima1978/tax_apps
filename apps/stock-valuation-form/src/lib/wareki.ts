/**
 * 元号の既定。第1表の1の元号プルダウンは未選択のままでも令和として扱う（様式の運用に合わせる）。
 * 表示・日付・年分の特定で同じ既定を使う必要があるので、値はここだけに置く。
 */
export const DEFAULT_ERA = '令和';

/** 元号の期間。元号年＋`base`＝西暦年。`end` が無いものは続いている元号。 */
interface EraRange {
  readonly base: number;
  readonly start: string;
  readonly end?: string;
}

/**
 * 元号の期間。改元日まで持つのは、元号の切り替わる年に期間外の日付（平成31年5月1日など）を
 * 受け付けないため。選択肢に無い元号（昭和）も変換できるようにしておく ── 第2表の開業年月日は
 * 昭和を選べるので、ここに無いと「西暦に直せない日付」が様式の中に残る。
 */
const ERAS: ReadonlyMap<string, EraRange> = new Map([
  ['令和', { base: 2018, start: '2019-05-01' }],
  ['平成', { base: 1988, start: '1989-01-08', end: '2019-04-30' }],
  ['昭和', { base: 1925, start: '1926-12-25', end: '1989-01-07' }],
]);

/**
 * 続いている元号で選べる年の上限。従来の選択肢の数（64）をそのまま引き継いでいる
 * ── 元号が続く限り上限は決まらないので、様式として現実的な範囲で切るしかない。
 */
const OPEN_ERA_MAX_YEAR = 64;

const eraRange = (era: string): EraRange | undefined => ERAS.get(era || DEFAULT_ERA);

/** その元号で使える年の上限（元号年）。知らない元号は 0。 */
export function eraLastYear(era: string): number {
  const range = eraRange(era);
  if (range === undefined) return 0;
  return range.end === undefined ? OPEN_ERA_MAX_YEAR : Number(range.end.slice(0, 4)) - range.base;
}

/** ISO 日付（`YYYY-MM-DD`）。実在しない日付なら null。 */
function toIsoDate(year: number, month: number, day: number): string | null {
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Date.UTC は 2桁の年を 1900 年代へ読み替えるので setUTCFullYear で組む
  const dt = new Date(0);
  dt.setUTCFullYear(year, month - 1, day);
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** その年月の日数（月が分からなければ 31）。 */
function daysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 31;
  if (!Number.isInteger(year) || year < 1) return month === 2 ? 29 : [4, 6, 9, 11].includes(month) ? 30 : 31;
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** 元号の日付を「令和8年3月15日」の形にする（表示・理由の文面用）。 */
function eraDateLabel(era: string, iso: string): string {
  const range = eraRange(era);
  const [yyyy = 0, mm = 0, dd = 0] = iso.split('-').map(Number);
  const eraYear = range === undefined ? yyyy : yyyy - range.base;
  return `${era}${eraYear === 1 ? '元' : eraYear}年${mm}月${dd}日`;
}

export type WarekiConversion = { ok: true; value: string } | { ok: false; reason: string };

/**
 * 元号・年・月・日を西暦（ISO）に直す。直せないときは理由を返す。
 *
 * 弾くのは3種類: 知らない元号・その元号に無い年（平成40年）・実在しない日付（2月31日）。
 * 以前は `new Date(y, m - 1, d)` で組んでいたため、2月31日が 3月3日 へ黙って読み替わっていた
 * ── 日付の前後関係の確認も会社規模の判定もこの値を見るので、誰にも見えないまま結果が変わる。
 */
export function convertWareki(era: string, year: number, month: number, day: number): WarekiConversion {
  const name = era || DEFAULT_ERA;
  const range = eraRange(name);
  if (range === undefined) return { ok: false, reason: `元号「${era}」は扱えません。` };
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return { ok: false, reason: '年月日は整数で入れてください。' };
  }
  if (year < 1) return { ok: false, reason: '年は1以上で入れてください。' };
  // 元号年の上限を先に見る（西暦が4桁を超えると「実在しない日付」に見えてしまうため）
  const lastYear = eraLastYear(name);
  if (year > lastYear) {
    return {
      ok: false,
      reason: range.end === undefined
        ? `${name}${lastYear}年より後は入れられません。`
        : `${name}は${eraDateLabel(name, range.end)}までです。`,
    };
  }
  const iso = toIsoDate(range.base + year, month, day);
  if (iso === null) return { ok: false, reason: `${month}月${day}日はありません。` };
  if (iso < range.start) return { ok: false, reason: `${name}は${eraDateLabel(name, range.start)}からです。` };
  if (range.end !== undefined && iso > range.end) {
    return { ok: false, reason: `${name}は${eraDateLabel(name, range.end)}までです。` };
  }
  return { ok: true, value: iso };
}

/**
 * 和暦の元号＋年を西暦年に直す。その元号に無い年なら null（元号が空のときは令和として扱う）。
 *
 * 日付の前後関係ではなく「年分」だけが要る場所（会社規模・率・一覧の並び）用。月日を見ないので
 * 改元の年は元号の期間を確かめられない ── 日付として確かめるなら `convertWareki` を使う。
 */
export function westernYear(era: string, year: number): number | null {
  const range = eraRange(era);
  if (range === undefined) return null;
  if (!Number.isInteger(year) || year < 1 || year > eraLastYear(era)) return null;
  return range.base + year;
}

/**
 * `${prefix}_g/_y/_m/_d` の4列プルダウン（元号・年・月・日）を Date にする。
 * どれか1つでも未入力なら判定不能として null、実在しない日付・元号の期間外も null を返す。
 */
export function readWarekiDate(get: (field: string) => string, prefix: string): Date | null {
  const result = readWareki(get, prefix);
  if (result === null || !result.ok) return null;
  const [y = 0, m = 1, d = 1] = result.value.split('-').map(Number);
  // 以前の呼び出し元が getFullYear/getMonth/getDate で読むので、ローカル時刻の 0 時で組む
  return new Date(y, m - 1, d);
}

/** 4欄が揃っているときだけ変換結果を返す（揃っていなければ null＝入力途中）。 */
function readWareki(get: (field: string) => string, prefix: string): WarekiConversion | null {
  const y = Number(get(`${prefix}_y`));
  const m = Number(get(`${prefix}_m`));
  const d = Number(get(`${prefix}_d`));
  if (!y || !m || !d) return null;
  return convertWareki(get(`${prefix}_g`) || DEFAULT_ERA, y, m, d);
}

/**
 * その日付欄が西暦に直せない理由（直せるなら null）。入力途中は null。
 *
 * 選択肢を元号に合わせて狭めても、過去に保存された案件・MCP やJSON取込から入った値は
 * 残ったままなので、確認事項として出す口が別に要る。
 */
export function warekiDateReason(get: (field: string) => string, prefix: string): string | null {
  const result = readWareki(get, prefix);
  return result !== null && !result.ok ? result.reason : null;
}

/**
 * 日付欄（元号・年・月・日）のプルダウンの選択肢。
 *
 * 第1表の1の課税時期・事業年度と、案件を作るときのダイアログが同じものを使う。別々に持つと、
 * ダイアログで入れた値が様式の <select> に無い値になり、「画面には出ているのに保存値は空」
 * という形で黙って食い違う（元号欄で実際に起きた。選択肢に空が無いため、閉じた <select> は
 * 先頭の「令和」を出すが、保存されているのは空）。
 */
const numOptions = (n: number) => ['', ...Array.from({ length: n }, (_, i) => String(i + 1))];

/** 元号は空の選択肢を置かない（未選択でも令和として扱う様式の運用に合わせる）。先頭は DEFAULT_ERA と揃えること */
export const ERA_OPTS = ['令和', '平成'];
export const MONTH_OPTS = numOptions(12);

/**
 * すでに入っている値を選択肢に残す。
 *
 * 狭めた選択肢に保存値が無いと `selectDisplayValue` が先頭を出すので、画面と保存値が食い違う
 * （閉じた <select> は「令和1年」を出しているのに保存値は平成40年、という形）。
 */
function withCurrent(options: readonly string[], current: string): string[] {
  return current !== '' && !options.includes(current) ? [...options, current] : [...options];
}

/** その元号で選べる年。保存値が範囲外のときは残す（画面と保存値を食い違わせない）。 */
export function yearOptionsFor(era: string, current = ''): string[] {
  return withCurrent(numOptions(eraLastYear(era)), current);
}

/** その年月に実在する日。年月が未入力のときは31日まで。 */
export function dayOptionsFor(era: string, year: string, month: string, current = ''): string[] {
  const western = westernYear(era, Number(year));
  return withCurrent(numOptions(daysInMonth(western ?? 0, Number(month))), current);
}

/** その日を含む元号。どの元号にも入らない日（明治より前など）は undefined。 */
function eraForIso(iso: string): { name: string; range: EraRange } | undefined {
  for (const [name, range] of ERAS) {
    if (iso >= range.start && (range.end === undefined || iso <= range.end)) return { name, range };
  }
  return undefined;
}

/**
 * 1年後の元号と年（翌年度更新・案件の複製の初期値用）。入れられない年なら null。
 *
 * 元号年に1を足すだけでは済まない ── 平成31年の翌年は平成32年ではなく令和2年で、
 * 平成30年5月1日の翌年は改元後なので令和元年5月1日になる。月日が分からないときは
 * その年の終わりで元号を決める（改元をまたぐ年は新しい元号を出す）。
 */
export function nextWarekiYear(era: string, year: number, month = 0, day = 0): { era: string; year: string } | null {
  const range = eraRange(era);
  if (range === undefined || !Number.isInteger(year) || year < 1) return null;
  const western = range.base + year + 1;
  const iso = toIsoDate(western, month || 12, day || 31) ?? toIsoDate(western, month || 12, 1);
  if (iso === null) return null;
  const found = eraForIso(iso);
  if (found === undefined) return null;
  const nextYear = western - found.range.base;
  return nextYear > eraLastYear(found.name) ? null : { era: found.name, year: String(nextYear) };
}

/**
 * 4列プルダウンのうち、選んだ元号・年月で変わるもの（年・日）の選択肢。
 *
 * 入れさせないのが本筋 ── 入れてから確認事項で知らせるより、平成40年や2月31日が選択肢に
 * 無いほうが早い。入っている値は残すので、過去の案件を開いても画面の見た目は変わらない。
 */
export function warekiDateOptions(get: (field: string) => string, prefix: string): { year: string[]; day: string[] } {
  const era = get(`${prefix}_g`) || DEFAULT_ERA;
  const year = get(`${prefix}_y`);
  return {
    year: yearOptionsFor(era, year),
    day: dayOptionsFor(era, year, get(`${prefix}_m`), get(`${prefix}_d`)),
  };
}
