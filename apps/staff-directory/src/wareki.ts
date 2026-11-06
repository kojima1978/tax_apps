/**
 * 生年月日を和暦の4つの欄（元号・年・月・日）で入れるための変換。
 *
 * 保存するのは今までどおり西暦の `YYYY-MM-DD`（サーバ・他アプリは和暦を知らない）。
 * 画面の欄が揃って正しい日付になったときだけ西暦を返し、途中や誤りのあいだは
 * `wareki:元号|年|月|日` の下書きの文字列を返す ── 下書きは西暦の形をしていないので、
 * 保存前に `birthDateError` が止める（黙って空にしたり別の日にしたりしない）。
 *
 * 改元日の表はこちらで持たず Intl に数えさせる。「平成31年5月1日」のような元号違いは、
 * 一度西暦へ直して Intl に和暦で刷らせ直し、元号か年が変わったら誤りにする。
 */

export type WarekiParts = { era: string; year: string; month: string; day: string };

// 元号の元年の前年（元号年 + これ = 西暦年）
const ERA_OFFSETS: Record<string, number> = {
  明治: 1867,
  大正: 1911,
  昭和: 1925,
  平成: 1988,
  令和: 2018,
};

export const ERA_NAMES = Object.keys(ERA_OFFSETS);

export const EMPTY_PARTS: WarekiParts = { era: '', year: '', month: '', day: '' };

const DRAFT_PREFIX = 'wareki:';
const ISO_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const japaneseFormat = new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {
  era: 'long',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  timeZone: 'UTC',
});

/** 実在する西暦の日付なら UTC 0時の Date、なければ null */
function isoDate(iso: string): Date | null {
  const m = ISO_PATTERN.exec(iso);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  dt.setUTCFullYear(y); // 0〜99年を 1900年代に読み替えさせない
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

/** 西暦の日付を和暦の欄へ。明治より前など元号の表に無い日付は null */
function isoToParts(iso: string): WarekiParts | null {
  const dt = isoDate(iso);
  if (!dt) return null;
  const get = (type: string) => japaneseFormat.formatToParts(dt).find((p) => p.type === type)?.value ?? '';
  const era = get('era');
  if (!(era in ERA_OFFSETS)) return null;
  // 元年は「元」と刷られることがあるので数に直す
  const year = get('year') === '元' ? '1' : get('year');
  return { era, year, month: get('month'), day: get('day') };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 欄の値を保存用の値へ。全部空なら ''、揃って正しければ西暦、それ以外は下書き */
export function partsToValue(parts: WarekiParts): string {
  const { era, year, month, day } = parts;
  if (!era && !year && !month && !day) return '';
  const iso = partsToIso(parts);
  if (iso) {
    const back = isoToParts(iso);
    if (back && back.era === era && back.year === String(Number(year))) return iso;
  }
  return `${DRAFT_PREFIX}${[era, year, month, day].join('|')}`;
}

/** 元号年をそのまま西暦へ足した日付（元号の範囲は見ない）。実在しなければ null */
function partsToIso({ era, year, month, day }: WarekiParts): string | null {
  if (!(era in ERA_OFFSETS) || !year || !month || !day) return null;
  const y = ERA_OFFSETS[era] + Number(year);
  const iso = `${y}-${pad(Number(month))}-${pad(Number(day))}`;
  return Number(year) >= 1 && isoDate(iso) ? iso : null;
}

/** 保存用の値（'' / 西暦 / 下書き）を欄の値へ */
export function valueToParts(value: string): WarekiParts {
  if (value.startsWith(DRAFT_PREFIX)) {
    const [era = '', year = '', month = '', day = ''] = value.slice(DRAFT_PREFIX.length).split('|');
    return { era, year, month, day };
  }
  return (value && isoToParts(value)) || EMPTY_PARTS;
}

/** 欄の横に添える西暦年（年まで揃っていれば） */
export function seirekiYearOf(parts: WarekiParts): number | null {
  if (!(parts.era in ERA_OFFSETS) || !parts.year || Number(parts.year) < 1) return null;
  return ERA_OFFSETS[parts.era] + Number(parts.year);
}

/** 保存できない値なら理由。'' と西暦は null */
export function birthDateError(value: string): string | null {
  if (!value.startsWith(DRAFT_PREFIX)) return null;
  const parts = valueToParts(value);
  const { era, year, month, day } = parts;
  if (!era || !year || !month || !day) return '生年月日は元号・年・月・日をすべて入れてください（消すなら全部空に）';
  const iso = partsToIso(parts);
  if (!iso) return '生年月日が存在しない日付です';
  // 年数を足した先が別の元号になっている（平成31年5月1日 → 令和元年5月1日）
  const actual = isoToParts(iso);
  if (!actual) return '生年月日が元号の範囲の外です';
  const yearText = actual.year === '1' ? '元' : actual.year;
  return `${era}${year}年${month}月${day}日は${actual.era}${yearText}年${actual.month}月${actual.day}日です`;
}
