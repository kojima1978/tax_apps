import { StaffSelect } from "@/components/staff-select";
import { ClientSummary } from "@/lib/clients";

/** 顧客の基本項目。新規登録フォームと顧客情報の編集モーダルで共用する。 */
export function ClientFields({ defaults, autoFocus = false }: { defaults?: Partial<ClientSummary>; autoFocus?: boolean }) {
  return <>
    <label>顧客名<input name="name" required maxLength={100} autoFocus={autoFocus} defaultValue={defaults?.name ?? ""} placeholder="例：山田 太郎" /></label>
    <label>顧客名（カナ）<input name="nameKana" maxLength={100} defaultValue={defaults?.nameKana ?? ""} placeholder="例：ヤマダ タロウ" /></label>
    <label>顧客コード<input name="clientCode" required maxLength={30} pattern="(?:[A-Za-z0-9_]|-)+" defaultValue={defaults?.clientCode ?? ""} placeholder="例：PB-000002" /></label>
    {/* 担当者は社員台帳の写しから選ぶ（ここで新しい人を足す口は持たない）。 */}
    <StaffSelect id="client-staff" defaultValue={defaults?.staffId ?? null} defaultLabel={defaults?.assignedStaff ?? ""} />
  </>;
}
