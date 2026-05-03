/** 日本の元号定義（明治以降） */
export interface JapaneseEra {
  code: 'reiwa' | 'heisei' | 'showa' | 'taisho' | 'meiji';
  label: string;       // 表示用（令和・平成・昭和・大正・明治）
  startYear: number;   // 元年の西暦
  startDate: string;   // YYYY-MM-DD（元号開始日）
  endDate?: string;    // YYYY-MM-DD（元号終了日、現行元号は undefined）
}

export const JAPANESE_ERAS: JapaneseEra[] = [
  { code: 'reiwa',  label: '令和', startYear: 2019, startDate: '2019-05-01' },
  { code: 'heisei', label: '平成', startYear: 1989, startDate: '1989-01-08', endDate: '2019-04-30' },
  { code: 'showa',  label: '昭和', startYear: 1926, startDate: '1926-12-25', endDate: '1989-01-07' },
  { code: 'taisho', label: '大正', startYear: 1912, startDate: '1912-07-30', endDate: '1926-12-24' },
  { code: 'meiji',  label: '明治', startYear: 1868, startDate: '1868-10-23', endDate: '1912-07-29' },
];

/** 西暦の YYYY-MM-DD から該当する元号と元号年を返す */
export function gregorianToWareki(value: string): { era: JapaneseEra; eraYear: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [yyyy, mm, dd] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const era = JAPANESE_ERAS.find(e => value >= e.startDate && (!e.endDate || value <= e.endDate));
  if (!era) return null;
  return { era, eraYear: yyyy - era.startYear + 1, month: mm, day: dd };
}

/** 元号 + 元号年 + 月 + 日 → YYYY-MM-DD */
export function warekiToGregorian(eraCode: JapaneseEra['code'], eraYear: number, month: number, day: number): string | null {
  const era = JAPANESE_ERAS.find(e => e.code === eraCode);
  if (!era || eraYear < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const yyyy = era.startYear + eraYear - 1;
  return `${String(yyyy).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** YYYY-MM-DD を「令和7年5月3日」形式に整形（不正値は空文字） */
export function formatWareki(value: string | null | undefined): string {
  if (!value) return '';
  const w = gregorianToWareki(value);
  if (!w) return '';
  return `${w.era.label}${w.eraYear}年${w.month}月${w.day}日`;
}
