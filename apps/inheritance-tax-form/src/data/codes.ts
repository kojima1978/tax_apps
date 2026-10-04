/**
 * 「記載要領等 相続税の申告書第1表、相続税の申告書第1表（続）」で定義されたコード表。
 * 様式にはコード（数字）を記入するため、value はコード文字列とし label に意味を添える。
 */

/** 記載要領等 1《元号コード》— 相続開始年月日・生年月日の元号欄 */
export const ERA_CODES = [
  { value: '1', label: '明治' },
  { value: '2', label: '大正' },
  { value: '3', label: '昭和' },
  { value: '4', label: '平成' },
  { value: '5', label: '令和' },
] as const;

export const ERA_OPTIONS = [
  { value: '', label: '' },
  ...ERA_CODES.map((c) => ({ value: c.value, label: `${c.value} ${c.label}` })),
];

/** 和暦の年（元年〜99年）。保存値は既存JSON互換の整数文字列、表示だけ2桁にする。 */
export const ERA_YEAR_OPTIONS = [
  { value: '', label: '' },
  ...Array.from({ length: 99 }, (_, index) => {
    const year = index + 1;
    return { value: String(year), label: String(year).padStart(2, '0') };
  }),
];

/** 元号コードごとの期間。元年の西暦と改元日（`YYYY-MM-DD`）。`endDate` が無いものは続いている元号。 */
interface EraPeriod {
  /** 元年の西暦（西暦 ＝ startYear ＋ 元号年 − 1） */
  readonly startYear: number;
  readonly startDate: string;
  readonly endDate?: string;
}

/**
 * 元号の期間。和暦と西暦を行き来する箇所はここを唯一の定義元にする。
 *
 * 改元日まで持つのは、元号の切り替わる年に期間外の日付（平成31年5月1日）を通さないため。
 * 元号年の選択肢は元号によらず1〜99年、日は1〜31日を並べているので、平成40年も2月31日も
 * 選べてしまう ── 範囲を見ないと平成40年が令和10年として黙って計算に入り、
 * 満年齢（第6表の未成年者・障害者控除）と相次相続控除の年数がその西暦で変わる。
 */
const ERA_PERIODS: Record<string, EraPeriod> = {
  1: { startYear: 1868, startDate: '1868-10-23', endDate: '1912-07-29' },
  2: { startYear: 1912, startDate: '1912-07-30', endDate: '1926-12-24' },
  3: { startYear: 1926, startDate: '1926-12-25', endDate: '1989-01-07' },
  4: { startYear: 1989, startDate: '1989-01-08', endDate: '2019-04-30' },
  5: { startYear: 2019, startDate: '2019-05-01' },
};

/** 元号コード → 元年の西暦。 */
export const ERA_BASE_YEAR: Record<string, number> = Object.fromEntries(
  Object.entries(ERA_PERIODS).map(([code, period]) => [code, period.startYear]),
);

/** 元号コード → 元号名（「4」→「平成」）。知らないコードは空文字。 */
const eraLabel = (code: string): string => ERA_CODES.find((c) => c.value === code)?.label ?? '';

/** その元号で入れられる元号年の上限。続いている元号は undefined（上限が決まらない）。 */
export function eraLastYear(code: string): number | undefined {
  const period = ERA_PERIODS[code.trim()];
  if (period === undefined || period.endDate === undefined) return undefined;
  return Number(period.endDate.slice(0, 4)) - period.startYear + 1;
}

/** 実在する日付なら `YYYY-MM-DD`、実在しなければ null（2月31日を3月3日へ読み替えない）。 */
function toIsoDate(year: number, month: number, day: number): string | null {
  if (year < 1 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Date.UTC は2桁の年を1900年代へ読み替えるので setUTCFullYear で組む
  const dt = new Date(0);
  dt.setUTCFullYear(year, month - 1, day);
  if (dt.getUTCFullYear() !== year || dt.getUTCMonth() !== month - 1 || dt.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** 元号の日付を「31年4月30日」の形にする（理由の文面用。元号名は呼び出し側で付ける）。 */
function eraDateLabel(code: string, iso: string): string {
  const period = ERA_PERIODS[code];
  const [yyyy = 0, mm = 0, dd = 0] = iso.split('-').map(Number);
  const eraYear = period === undefined ? yyyy : yyyy - period.startYear + 1;
  return `${eraYear === 1 ? '元' : eraYear}年${mm}月${dd}日`;
}

/** 日付欄のうち、どの欄が原因で西暦に直せないか。 */
export interface EraDateFault {
  /** 年・月・日のどの欄を赤くするか（元号そのものの誤りは隣の年欄に出す） */
  part: 'y' | 'm' | 'd';
  reason: string;
}

export type EraDateResult =
  | { ok: true; year: number; month: number; day: number }
  | ({ ok: false } & EraDateFault);

/**
 * 元号コード・元号年・月・日を西暦の年月日に直す。直せないときは原因の欄と理由を返す。
 *
 * 弾くのは3種類: 知らない元号コード・その元号に無い年（平成40年・平成31年5月1日）・
 * 実在しない日付（2月31日）。様式の日付欄を西暦として読む処理はすべてここを通す。
 */
export function convertEraDate(era: string, year: number, month: number, day: number): EraDateResult {
  const code = era.trim();
  const period = ERA_PERIODS[code];
  if (period === undefined) return { ok: false, part: 'y', reason: '元号を選んでください。' };
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return { ok: false, part: 'y', reason: '年月日は整数で入れてください。' };
  }
  if (year < 1) return { ok: false, part: 'y', reason: '年は1以上で入れてください。' };
  const name = eraLabel(code);
  const until = `${name}は${period.endDate === undefined ? '' : eraDateLabel(code, period.endDate)}までです。`;
  // 元号年の上限を先に見る（西暦が4桁を超えると「実在しない日付」に見えてしまうため）
  const lastYear = eraLastYear(code);
  if (lastYear !== undefined && year > lastYear) return { ok: false, part: 'y', reason: until };

  const iso = toIsoDate(period.startYear + year - 1, month, day);
  if (iso === null) {
    return month < 1 || month > 12
      ? { ok: false, part: 'm', reason: `${month}月はありません。` }
      : { ok: false, part: 'd', reason: `${month}月${day}日はありません。` };
  }
  // 改元の年は日付まで見る（平成31年5月1日は令和元年5月1日）。直す先は元号なので理由に元号名を入れる
  if (iso < period.startDate) {
    return { ok: false, part: 'y', reason: `${name}は${eraDateLabel(code, period.startDate)}からです。` };
  }
  if (period.endDate !== undefined && iso > period.endDate) return { ok: false, part: 'y', reason: until };
  return { ok: true, year: period.startYear + year - 1, month, day };
}

/**
 * 元号コード＋元号年 → 西暦年。その元号に無い年なら undefined。
 *
 * 月日を見ないので改元の年は元号の期間を確かめられない ── 日付として読むなら `convertEraDate`。
 * 「年分」だけが要る場所（相続時精算課税の贈与年分）用。
 */
export function eraWesternYear(era: string, year: number): number | undefined {
  const period = ERA_PERIODS[era.trim()];
  if (period === undefined || !Number.isInteger(year) || year < 1) return undefined;
  const lastYear = eraLastYear(era);
  if (lastYear !== undefined && year > lastYear) return undefined;
  return period.startYear + year - 1;
}

/**
 * その西暦年を含む元号（元号コードと元年の西暦）。明治より前は undefined。
 *
 * 改元の年は新しい元号を返す（2019年＝令和元年）。贈与税の「年分」の扱いに合わせたもので、
 * 日付としての元号を決めるものではない ── 日付なら `convertEraDate` を使う。
 */
export function eraForWesternYear(year: number): { code: string; startYear: number } | undefined {
  const found = Object.entries(ERA_PERIODS).reverse().find(([, period]) => period.startYear <= year);
  return found === undefined ? undefined : { code: found[0], startYear: found[1].startYear };
}

/**
 * 日付欄（`${prefix}Era` / `${prefix}Y` / `${prefix}M` / `${prefix}D`）が
 * 西暦に直せない理由。直せるとき・4欄が揃っていない入力途中は null。
 */
export function eraDateFault(g: (field: string) => string, prefix: string): EraDateFault | null {
  const era = g(`${prefix}Era`).trim();
  const year = Number(g(`${prefix}Y`));
  const month = Number(g(`${prefix}M`));
  const day = Number(g(`${prefix}D`));
  if (era === '' || !year || !month || !day) return null;
  const result = convertEraDate(era, year, month, day);
  return result.ok ? null : { part: result.part, reason: result.reason };
}

/** 相続時精算課税制度が創設された年（平成15年）。これより前の年分は存在しない */
const GIFT_YEAR_FIRST = 2003;

/**
 * 西暦 →「令和6」「平成15」形式の和暦表記。
 * 2019年は平成31年と令和元年にまたがるが、贈与税の「年分」は令和元年分として扱う。
 * 用途を相続時精算課税の年分（平成15年以降）に限っているため、この2元号だけを見る。
 */
function giftYearLabel(year: number): string {
  return year >= ERA_BASE_YEAR[5]
    ? `令和${year === ERA_BASE_YEAR[5] ? '元' : year - ERA_BASE_YEAR[5] + 1}`
    : `平成${year - ERA_BASE_YEAR[4] + 1}`;
}

/**
 * 相続時精算課税の「贈与を受けた年分」の選択肢。
 * 平成15年（制度創設）から相続開始年までを新しい順に並べる。保存値は表示と同じ和暦表記。
 * 相続開始年月日が未入力のうちは今年を上限にしておく（後から入れれば絞られる）。
 */
export function giftYearOptions(startEra: string, startYear: string): { value: string; label: string }[] {
  const start = eraWesternYear(startEra, Number(startYear)) ?? new Date().getFullYear();
  const last = Math.max(start, GIFT_YEAR_FIRST);
  return [
    { value: '', label: '' },
    ...Array.from({ length: last - GIFT_YEAR_FIRST + 1 }, (_, index) => {
      const label = giftYearLabel(last - index);
      return { value: label, label };
    }),
  ];
}

/** 月・日。保存値は既存JSON互換の整数文字列、表示だけ2桁にする。 */
const twoDigitOptions = (count: number) => [
  { value: '', label: '' },
  ...Array.from({ length: count }, (_, index) => {
    const value = index + 1;
    return { value: String(value), label: String(value).padStart(2, '0') };
  }),
];

export const MONTH_OPTIONS = twoDigitOptions(12);
export const DAY_OPTIONS = twoDigitOptions(31);

/**
 * 記載要領等 4《続柄コード》— 「被相続人との続柄」欄
 * ※1「10 子」は「11 長男」〜「19 九男」又は「21 長女」〜「29 九女」に該当しない子に使用する。
 * ※2「90 養子」と他の続柄いずれにも該当する場合は「90 養子」を選択する。
 */
export const RELATION_CODES = [
  { value: '01', label: '配偶者' },
  { value: '10', label: '子' },
  { value: '11', label: '長男' },
  { value: '12', label: '二男' },
  { value: '13', label: '三男' },
  { value: '14', label: '四男' },
  { value: '15', label: '五男' },
  { value: '16', label: '六男' },
  { value: '17', label: '七男' },
  { value: '18', label: '八男' },
  { value: '19', label: '九男' },
  { value: '21', label: '長女' },
  { value: '22', label: '二女' },
  { value: '23', label: '三女' },
  { value: '24', label: '四女' },
  { value: '25', label: '五女' },
  { value: '26', label: '六女' },
  { value: '27', label: '七女' },
  { value: '28', label: '八女' },
  { value: '29', label: '九女' },
  { value: '30', label: '孫' },
  { value: '41', label: '父' },
  { value: '42', label: '母' },
  { value: '51', label: '祖父' },
  { value: '52', label: '祖母' },
  { value: '61', label: '兄' },
  { value: '62', label: '弟' },
  { value: '63', label: '姉' },
  { value: '64', label: '妹' },
  { value: '90', label: '養子' },
  { value: '99', label: 'その他' },
] as const;

export const RELATION_OPTIONS = [
  { value: '', label: '' },
  ...RELATION_CODES.map((c) => ({ value: c.value, label: `${c.value} ${c.label}` })),
];

/**
 * 都道府県（値も印字も県名そのもの）。
 *
 * 税務署の一覧（`TAX_OFFICE_PREFS`）も同じ47件を持つが、あちらは国税局の管轄順で、
 * 署の選択肢をその順に並べるための並びになっている。住所として選ぶ欄はふつうの
 * 北から南の順（全国地方公共団体コード順）でないと探せないので、別に持つ。
 */
export const PREFECTURES = [
  '北海道',
  '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県',
  '岐阜県', '静岡県', '愛知県', '三重県',
  '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県',
  '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県',
  '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県',
  '沖縄県',
] as const;

export const PREFECTURE_OPTIONS = PREFECTURES.map((pref) => ({ value: pref, label: pref }));

/** 生年月日欄の右に破線枠で印字されている元号コードの注記 */
export const ERA_NOTE = '生年月日の元号は、次の\n１〜５から選択してください。\n1:明治 2:大正 3:昭和\n4:平成 5:令和';
