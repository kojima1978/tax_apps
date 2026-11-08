/**
 * 取得日の読み取り（CSV・案件JSON・台帳 PDF からの取込で共通）。
 *
 * MCP サーバーもこのファイルを直接 import するので、DOM にも `@/` の別名にも頼らない。
 */

/** 元号の頭文字と開始日。終わりは次の元号の開始日の前日。 */
const ERAS = [
  { names: ['M', '明治', '明'], start: '1868-10-23' },
  { names: ['T', '大正', '大'], start: '1912-07-30' },
  { names: ['S', '昭和', '昭'], start: '1926-12-25' },
  { names: ['H', '平成', '平'], start: '1989-01-08' },
  { names: ['R', '令和', '令'], start: '2019-05-01' },
] as const;

/** 読み取りの結果。読めなかったときは value が空文字で warning に理由が入る。 */
export interface DateParseResult {
  /** YYYY-MM-DD（読めなければ空文字） */
  value: string;
  /** 人に確かめてほしいこと（日を補った・元号の範囲外・読めない） */
  warning?: string;
}

/** 全角の数字・記号・空白を半角へ寄せる */
function toHalfWidth(raw: string): string {
  return raw
    .replace(/[０-９Ａ-Ｚａ-ｚ．／－]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[ー―‐]/g, '-')
    .replace(/[\s　]/g, '');
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** 実在する日付なら YYYY-MM-DD、しなければ undefined（2月30日などを黙って翌月へ送らない） */
function existingDate(year: number, month: number, day: number): string | undefined {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return undefined;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    return undefined;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Excel のシリアル値（1900年1月0日起点・1900年うるう年の誤りを含む）を YYYY-MM-DD へ */
export function excelSerialToDate(serial: number): string {
  const d = new Date((Math.floor(serial) - 25569) * 86400000);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** 年・月・日（日は省略可）から結果を作る。日が無ければ1日として補い、その旨を返す。 */
function build(year: number, month: number, day: number | undefined, raw: string): DateParseResult {
  const value = existingDate(year, month, day ?? 1);
  if (!value) return { value: '', warning: `取得日「${raw}」は実在しない日付です` };
  if (day === undefined) {
    return { value, warning: `取得日「${raw}」は年月だけなので1日としました` };
  }
  return { value };
}

/**
 * 取得日を YYYY-MM-DD へ読み替える。
 *
 * 受けるもの: Excel シリアル値／2020-04-01・2020/4/1・2020.4.1・20200401／
 * 2020年4月1日／H27.4.1・R3/4/1／平成27年4月1日・令和元年5月1日／
 * 年月だけのもの（2020/4・令和3年4月 → 1日とし、警告を付ける）。
 */
export function parseDate(input: unknown): DateParseResult {
  if (input === null || input === undefined || input === '') {
    return { value: '', warning: '取得日がありません' };
  }
  if (typeof input === 'number') {
    if (input > 10000 && input < 100000) return { value: excelSerialToDate(input) };
    return { value: '', warning: `取得日「${input}」を日付として読めません` };
  }
  if (typeof input !== 'string') {
    return { value: '', warning: '取得日が文字列ではありません' };
  }

  const raw = input.trim();
  const s = toHalfWidth(raw);

  // Excel シリアル値
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const num = Number(s);
    if (num > 10000 && num < 100000) return { value: excelSerialToDate(num) };
  }

  // ISO 形式の時刻付き（2020-04-01T00:00:00Z）は日付の部分だけ見る
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T/);
  if (iso) return build(Number(iso[1]), Number(iso[2]), Number(iso[3]), raw);

  // 20200401
  const compact = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return build(Number(compact[1]), Number(compact[2]), Number(compact[3]), raw);

  // 西暦: 2020-04-01 / 2020/4/1 / 2020.4.1 / 2020年4月1日（日は省略可）
  const western = s.match(/^(\d{4})(?:[./-]|年)(\d{1,2})(?:(?:[./-]|月)(\d{1,2})日?|月)?$/);
  if (western) {
    return build(Number(western[1]), Number(western[2]), western[3] ? Number(western[3]) : undefined, raw);
  }

  // 和暦: H27.4.1 / R3/4/1 / 平成27年4月1日 / 令和元年5月 / 平27.4.1
  const wareki = s.match(/^(明治|大正|昭和|平成|令和|[MTSHR明大昭平令])(元|\d{1,2})(?:[./-]|年)(\d{1,2})(?:(?:[./-]|月)(\d{1,2})日?|月)?$/i);
  if (wareki) {
    const head = wareki[1]!.toUpperCase();
    const eraIndex = ERAS.findIndex((e) => (e.names as readonly string[]).includes(head));
    const era = ERAS[eraIndex]!;
    const eraYear = wareki[2] === '元' ? 1 : Number(wareki[2]);
    const year = Number(era.start.slice(0, 4)) + eraYear - 1;
    const result = build(year, Number(wareki[3]), wareki[4] ? Number(wareki[4]) : undefined, raw);
    if (!result.value) return result;
    // 平成31年5月1日のように、その元号の期間に無い日付は書き損じの恐れがある
    const next = ERAS[eraIndex + 1];
    if (result.value < era.start || (next && result.value >= next.start)) {
      const note = `取得日「${raw}」は${era.names[1]}の期間外です（西暦 ${result.value} として読みました）`;
      return { value: result.value, warning: result.warning ? `${result.warning}。${note}` : note };
    }
    return result;
  }

  return { value: '', warning: `取得日「${raw}」を日付として読めません` };
}

/**
 * CSV 取込用: 読めた日付は YYYY-MM-DD、読めなければ元の文字列を残す
 * （Step 3 で人が直せるよう、取込元の値を消さない）。
 */
export function normalizeDate(value: string): string {
  if (!value) return '';
  const { value: parsed } = parseDate(value);
  return parsed || value.trim();
}
