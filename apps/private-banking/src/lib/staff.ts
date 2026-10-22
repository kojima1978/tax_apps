/**
 * 担当者。社員台帳（staff-directory）の写しで、追加・修正・退職は台帳で行う。
 * 内部の `id` と、人が確認する一意な `staffCode`（社員番号、無ければ `SD-<台帳ID>`）を分ける。
 * 氏名は同姓同名を許す。
 */
export type Staff = {
  id: number;
  staffCode: string;
  name: string;
  nameKana: string;
  department: string;
  /** 退職。候補からは外すが、担当していた顧客の「担当 ○○」はそのまま残す。 */
  isActive: boolean;
  /** 社員台帳の台帳ID。無い行は台帳に居ない「未連携」の担当者で、候補には出さない。 */
  staffDirectoryId: number | null;
  /** 担当している顧客の数。 */
  clientCount: number;
};

/**
 * 選択欄に出す候補。退職した担当者は候補から外すが、**いま選ばれている1人だけは残す** ──
 * 外すと選択欄が黙って「未設定」を指し、他の項目を直して保存した瞬間に担当者が消える。
 */
export const staffOptions = (staff: readonly Staff[], selectedId: number | null) =>
  staff.filter((row) => (row.isActive && row.staffDirectoryId !== null) || row.id === selectedId);

/**
 * 部署を併記した表示。コードは `withCode` のときだけ足す（同姓同名の見分けにしか要らない）──
 * `staffCode` は社員番号が未登録なら `SD-<台帳ID>` の自動生成で、この事務所は62人全員がそれなので、
 * 常に併記すると意味を持たない文字が全行に並ぶ。
 */
export const staffOptionLabel = (row: Pick<Staff, "staffCode" | "name" | "department" | "isActive">, withCode = false) => {
  const identity = [withCode ? row.staffCode : "", row.department].filter(Boolean).join("・");
  return `${row.name}${identity ? `（${identity}）` : ""}${row.isActive ? "" : "（退職）"}`;
};

/** 同じ氏名が候補に2人以上いる氏名。コードを併記するのはこの人たちだけ。 */
export const ambiguousStaffNames = (staff: readonly Pick<Staff, "name">[]) => {
  const counts = new Map<string, number>();
  for (const row of staff) counts.set(row.name, (counts.get(row.name) ?? 0) + 1);
  return new Set([...counts].filter(([, count]) => count > 1).map(([name]) => name));
};

/** 部署が空の人をまとめる見出し。 */
export const NO_DEPARTMENT_LABEL = "部署なし";

/**
 * 候補を部署で束ねる。62人を平らに並べると選択欄には6行しか見えず、
 * 並びも（カナ未登録なので）漢字コードポイント順で人には無作為に見えるため。
 *
 * グループは部署名順。**漢字の並びなので読み順にはならない**（実測で「資産税部」が
 * 「第一部」より先に来る）が、人の増減で位置が動かないことを優先した。
 * 部署なしは最後。グループの中は渡された順（API はカナ順→氏名順）をそのまま保つ。
 */
export const groupStaffByDepartment = (staff: readonly Staff[]) => {
  const groups = new Map<string, Staff[]>();
  for (const row of staff) {
    const label = row.department || NO_DEPARTMENT_LABEL;
    const members = groups.get(label);
    if (members) members.push(row);
    else groups.set(label, [row]);
  }
  return [...groups]
    .map(([label, options]) => ({ label, options }))
    .sort((a, b) => a.label === NO_DEPARTMENT_LABEL ? 1 : b.label === NO_DEPARTMENT_LABEL ? -1 : a.label.localeCompare(b.label, "ja"));
};

