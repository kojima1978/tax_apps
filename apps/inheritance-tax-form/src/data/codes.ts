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

/** 生年月日欄の右に破線枠で印字されている元号コードの注記 */
export const ERA_NOTE = '生年月日の元号は、次の\n１〜５から選択してください。\n1:明治 2:大正 3:昭和\n4:平成 5:令和';
