import rawIndustryCategories from './industryCategories.json';

export interface IndustryCategory {
  大分類: string;
  中分類: string;
  小分類: string;
  名前: string;
  番号: number;
  内容: string;
}

export const INDUSTRY_CATEGORIES = rawIndustryCategories as IndustryCategory[];

const INDUSTRY_BY_NUMBER = new Map(
  INDUSTRY_CATEGORIES.map((category) => [String(category.番号), category]),
);

const LARGE_INDUSTRY_BY_NAME = new Map(
  INDUSTRY_CATEGORIES
    .filter((category) => category.中分類 === '' && category.小分類 === '')
    .map((category) => [category.大分類, category]),
);

const MIDDLE_INDUSTRY_BY_PATH = new Map(
  INDUSTRY_CATEGORIES
    .filter((category) => category.中分類 !== '' && category.小分類 === '')
    .map((category) => [`${category.大分類}\u0000${category.中分類}`, category]),
);

function industryOptionLabel(category: IndustryCategory): string {
  const hierarchy = [category.大分類, category.中分類, category.小分類]
    .filter((name, index, names) => name !== '' && name !== names[index - 1])
    .join(' ＞ ');

  return `${category.番号}　${hierarchy || category.名前}`;
}

export const INDUSTRY_OPTIONS = [
  { value: '', label: '業種目を選択' },
  ...INDUSTRY_CATEGORIES.map((category) => ({
    value: String(category.番号),
    label: industryOptionLabel(category),
  })),
];

export function industryCategoryOf(number: string): IndustryCategory | undefined {
  return INDUSTRY_BY_NUMBER.get(number);
}

/** 評価通達181に基づく原則区分と、選択できる直上区分を返す。 */
export function similarIndustryOptions(numbers: readonly string[]) {
  const candidates = new Map<number, IndustryCategory>();

  for (const number of numbers) {
    const category = industryCategoryOf(number);
    if (!category) continue;

    candidates.set(category.番号, category);

    const parent = category.小分類 !== ''
      ? MIDDLE_INDUSTRY_BY_PATH.get(`${category.大分類}\u0000${category.中分類}`)
      : category.中分類 !== ''
        ? LARGE_INDUSTRY_BY_NAME.get(category.大分類)
        : undefined;
    if (parent) candidates.set(parent.番号, parent);
  }

  return [
    { value: '', label: '類似業種を選択' },
    ...Array.from(candidates.values(), (category) => ({
      value: String(category.番号),
      label: industryOptionLabel(category),
    })),
  ];
}
