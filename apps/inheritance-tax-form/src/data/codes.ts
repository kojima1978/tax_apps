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

/** 元号コード → 元年の西暦。和暦と西暦を行き来する箇所はここを唯一の定義元にする。 */
export const ERA_BASE_YEAR: Record<string, number> = { 1: 1868, 2: 1912, 3: 1926, 4: 1989, 5: 2019 };

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
  const base = ERA_BASE_YEAR[startEra.trim()];
  const year = Number(startYear);
  const start = base !== undefined && Number.isInteger(year) && year > 0 ? base + year - 1 : new Date().getFullYear();
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
