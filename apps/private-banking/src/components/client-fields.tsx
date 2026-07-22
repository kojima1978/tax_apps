import { ClientSummary } from "@/lib/clients";

/** 顧客の基本項目。新規登録フォームと顧客情報の編集モーダルで共用する。 */
export function ClientFields({ defaults, autoFocus = false }: { defaults?: Partial<ClientSummary>; autoFocus?: boolean }) {
  return <>
    <label>顧客名<input name="name" required maxLength={100} autoFocus={autoFocus} defaultValue={defaults?.name ?? ""} placeholder="例：山田 太郎" /></label>
    <label>顧客名（かな）<input name="nameKana" maxLength={100} defaultValue={defaults?.nameKana ?? ""} placeholder="例：やまだ たろう" /></label>
    <label>顧客コード<input name="clientCode" required maxLength={30} pattern="(?:[A-Za-z0-9_]|-)+" defaultValue={defaults?.clientCode ?? ""} placeholder="例：PB-000002" /></label>
    <label>担当者<input name="assignedStaff" maxLength={100} defaultValue={defaults?.assignedStaff ?? ""} placeholder="例：佐藤税理士" /></label>
  </>;
}
