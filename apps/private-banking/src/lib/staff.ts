/**
 * 担当者の台帳。内部の `id` と、人が確認する一意な `staffCode` を分ける。
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
  /** 担当している顧客の数。0 件のときだけ削除できる。 */
  clientCount: number;
};

/**
 * 選択欄に出す候補。退職した担当者は候補から外すが、**いま選ばれている1人だけは残す** ──
 * 外すと選択欄が黙って「未設定」を指し、他の項目を直して保存した瞬間に担当者が消える。
 */
export const staffOptions = (staff: readonly Staff[], selectedId: number | null) =>
  staff.filter((row) => row.isActive || row.id === selectedId);

/** コードと部署を併記し、同姓同名でも選び間違えない表示にする。 */
export const staffOptionLabel = (row: Pick<Staff, "staffCode" | "name" | "department" | "isActive">) => {
  const identity = [row.staffCode, row.department].filter(Boolean).join("・");
  return `${row.name}${identity ? `（${identity}）` : ""}${row.isActive ? "" : "（退職）"}`;
};

