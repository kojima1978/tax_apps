/**
 * 担当者の台帳。顧客の `assignedStaff`（自由入力）を置き換えたもので、
 * 名前の一意制約が「佐藤」と「佐藤税理士」のような登録揺れを止める。
 */
export type Staff = {
  id: number;
  name: string;
  nameKana: string;
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

/** 退職した担当者は、選択欄でも管理画面でもそれと分かる形で出す。 */
export const staffOptionLabel = (row: Pick<Staff, "name" | "isActive">) => (row.isActive ? row.name : `${row.name}（退職）`);

