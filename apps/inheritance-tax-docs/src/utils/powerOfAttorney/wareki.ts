/**
 * 委任状に刷る和暦の日付（`昭和45年3月2日`）。
 *
 * 入力は西暦（1970/3/2・1970-03-02・1970年3月2日）でも和暦（昭和45年3月2日・S45.3.2・平成元年…）でもよい。
 * 改元日の表はこちらで持たず Intl に数えさせ、和暦で打たれた日付も一度西暦へ直してから
 * Intl に刷らせ直す ── 「平成31年5月1日」のような元号違いを、表を持たずに見つけるため。
 */

export type WarekiResult = { ok: true; text: string } | { ok: false; error: string };

// 元号の元年の前年（元号年 + これ = 西暦年）
const ERAS: Record<string, { name: string; offset: number }> = {
  m: { name: '明治', offset: 1867 },
  t: { name: '大正', offset: 1911 },
  s: { name: '昭和', offset: 1925 },
  h: { name: '平成', offset: 1988 },
  r: { name: '令和', offset: 2018 },
};

const findEra = (token: string) =>
  ERAS[token.toLowerCase()] ?? Object.values(ERAS).find((era) => era.name === token);

const ERA_PATTERN = /^(明治|大正|昭和|平成|令和|[mtshr])(元|\d+)[年/.-](\d{1,2})[月/.-](\d{1,2})日?$/i;
const SEIREKI_PATTERNS = [/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/, /^(\d{4})年(\d{1,2})月(\d{1,2})日$/];

/** UTC 0時の Date を和暦で刷る。元号年の1は「元」にする（委任状・戸籍の書き方に合わせる） */
export function formatWareki(date: Date): string {
  const parts = new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {
    era: 'long',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    // 呼び出し側は UTC 0時で組む。JST で刷ると日本時間の9時より前の日付が前日に化ける
    timeZone: 'UTC',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const year = value('year');
  return `${value('era')}${year === '1' ? '元' : year}年${value('month')}月${value('day')}日`;
}

/** 実在する日付なら UTC 0時の Date、無ければ null（V8 は 2月31日を 3月3日へ繰り上げるので往復で比べる） */
function utcDate(year: number, month: number, day: number): Date | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

/** 生年月日の欄。空なら空文字のまま通す（手書きで埋める欄として刷る） */
export function parseBirthDate(input: string): WarekiResult {
  const text = input.normalize('NFKC').replace(/\s/g, '');
  if (!text) return { ok: true, text: '' };

  const eraMatch = text.match(ERA_PATTERN);
  if (eraMatch) {
    const era = findEra(eraMatch[1]);
    const eraYear = eraMatch[2] === '元' ? 1 : Number(eraMatch[2]);
    const date = era && eraYear >= 1 ? utcDate(era.offset + eraYear, Number(eraMatch[3]), Number(eraMatch[4])) : null;
    if (!date) return { ok: false, error: '存在しない日付です' };
    const formatted = formatWareki(date);
    // 平成31年5月1日 → 令和元年5月1日、のように元号が変わったら打ち間違いとして返す
    if (!era || !formatted.startsWith(era.name)) return { ok: false, error: '元号と年月日の組み合わせを確認してください' };
    return { ok: true, text: formatted };
  }

  const match = SEIREKI_PATTERNS.map((pattern) => text.match(pattern)).find(Boolean);
  if (!match) return { ok: false, error: '1970/3/2 か 昭和45年3月2日 の形で入力してください' };
  const date = utcDate(Number(match[1]), Number(match[2]), Number(match[3]));
  if (!date) return { ok: false, error: '存在しない日付です' };
  return { ok: true, text: formatWareki(date) };
}

/** 書類の日付（今日）。日本時間で数える（UTC のままだと朝9時まで前日になる） */
export function todayWareki(now: Date = new Date()): string {
  const [year, month, day] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo' }).format(now).split('-').map(Number);
  return formatWareki(new Date(Date.UTC(year, month - 1, day)));
}
