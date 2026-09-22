import { describe, expect, it } from 'vitest';
import { TAX_OFFICES, TAX_OFFICE_GROUPS, TAX_OFFICE_PREFS } from './taxOffices';

/** 重複している値（無ければ空配列） */
const duplicates = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) dup.add(value);
    seen.add(value);
  }
  return [...dup];
};

/**
 * 一覧は手で打った表なので、壊れても画面には出ない形で壊れる（候補が1つ足りない、
 * 県をまたいで1署だけ別の県の欄に出る、など）。ヘッダのコメントが前提にしている
 * 「全524署」「name は全国一意」をここで実際に確かめる。
 */
describe('税務署の一覧', () => {
  it('47都道府県・全524署がそろっている', () => {
    expect(TAX_OFFICE_PREFS).toHaveLength(47);
    expect(TAX_OFFICES).toHaveLength(524);
  });

  it('署名は全国で一意（署を選べば都道府県も決まる）', () => {
    expect(duplicates(TAX_OFFICES.map((office) => office.name))).toEqual([]);
  });

  it('署番号は5桁の数字で、重複しない', () => {
    expect(TAX_OFFICES.filter((office) => !/^\d{5}$/.test(office.code))).toEqual([]);
    expect(duplicates(TAX_OFFICES.map((office) => office.code))).toEqual([]);
  });

  it('署名に「税務署」は入れない（様式側の固定文字なので）', () => {
    expect(TAX_OFFICES.filter((office) => office.name.includes('税務署'))).toEqual([]);
  });

  it('どの県にも署があり、一覧に無い県名は出てこない', () => {
    const prefs = new Set(TAX_OFFICES.map((office) => office.pref));
    expect(duplicates(TAX_OFFICE_PREFS)).toEqual([]);
    expect(TAX_OFFICE_PREFS.filter((pref) => !prefs.has(pref))).toEqual([]);
    expect([...prefs].filter((pref) => !TAX_OFFICE_PREFS.includes(pref))).toEqual([]);
  });

  it('県名は他の県名の先頭一致にならない（住所の先頭一致で県を決めているため）', () => {
    const ambiguous = TAX_OFFICE_PREFS.filter(
      (pref) => TAX_OFFICE_PREFS.some((other) => other !== pref && other.startsWith(pref)),
    );
    expect(ambiguous).toEqual([]);
  });

  it('県ごとの選択肢は一覧の順で、全署がちょうど1回ずつ出る', () => {
    expect(TAX_OFFICE_GROUPS.map((group) => group.label)).toEqual([...TAX_OFFICE_PREFS]);
    // 一致するのは署が県ごとにまとまって並んでいるからで、1署でも別の県の塊に混ざれば落ちる
    expect(TAX_OFFICE_GROUPS.flatMap((group) => group.options.map((option) => option.value)))
      .toEqual(TAX_OFFICES.map((office) => office.name));
    expect(TAX_OFFICE_GROUPS.flatMap(
      (group) => group.options.filter((option) => option.value !== option.label),
    )).toEqual([]);
  });
});
