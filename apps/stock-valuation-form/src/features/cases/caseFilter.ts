// 案件一覧の絞り込み。会社名だけを見る（一覧に並ぶのは会社名と課税時期・更新日時だけなので、
// 探すときの手がかりも会社名）。
//
// 空白を落として比べるのは、同じ会社を「甲田 製作所」「甲田製作所」と打ち分けていることが
// あるため。英字の会社名のために大文字小文字も揃える。

/**
 * 会社名の突き合わせに使う形。絞り込み（caseFilter）と年分のまとめ（caseGroups）で
 * 揃えておかないと、絞り込んだときだけまとまり方が変わる。
 */
export const normalizeCompanyName = (value: string) =>
  value.replace(/[\s\u3000]+/g, '').toLowerCase();

export function filterCasesByCompany<T extends { companyName: string }>(
  cases: readonly T[],
  query: string,
): readonly T[] {
  const needle = normalizeCompanyName(query);
  if (needle === '') return cases;
  return cases.filter((item) => normalizeCompanyName(item.companyName).includes(needle));
}
