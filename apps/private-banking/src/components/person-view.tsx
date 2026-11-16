"use client";

import { CalendarDays, CircleAlert, CircleCheck, CircleUserRound, LoaderCircle, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { DateInput } from "@/components/date-input";
import { StaffSelect } from "@/components/staff-select";
import { StaffHistory } from "@/components/staff-history";
import { LeaveConfirmModal, useLeaveGuard } from "@/components/use-leave-guard";
import { ageOnDate } from "@/lib/family";
import { formSnapshot, hasUnsavedFormChanges } from "@/lib/form-snapshot";
import { dateJaWithWareki } from "@/lib/format";
import type { Portfolio } from "@/lib/portfolio-view";

export function PersonView({
  household,
  referenceDate,
  saving,
  saved,
  onSubmit,
  onRequestDelete,
}: {
  household: Portfolio["household"];
  referenceDate: string;
  saving: boolean;
  saved: boolean;
  /** 保存できたら true。保存できた内容を「保存済み」の控えにする。 */
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  onRequestDelete: () => void;
}) {
  const age = ageOnDate(household.birthDate, referenceDate);
  const formRef = useRef<HTMLFormElement>(null);
  // 保存済みの内容の控え。いまの入力（送る FormData）がこれと違えば「保存していない変更」。
  const savedSnapshot = useRef<string | null>(null);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (formRef.current) savedSnapshot.current = formSnapshot(formRef.current); }, []);
  const isDirty = useCallback(() => hasUnsavedFormChanges(savedSnapshot.current, formRef.current), []);
  const leaveGuard = useLeaveGuard(isDirty);

  // 生年月日と担当者は、選んだ結果を次の描画で隠し欄へ書く。描画が済んでから比べる。
  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleDirtyCheck = () => {
    if (checkTimer.current !== null) clearTimeout(checkTimer.current);
    checkTimer.current = setTimeout(() => setDirty(isDirty()), 0);
  };
  useEffect(() => () => { if (checkTimer.current !== null) clearTimeout(checkTimer.current); }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    const form = event.currentTarget;
    const sent = formSnapshot(form);
    if (!(await onSubmit(event))) return;
    // 控えは「送った内容」。保存している間に打ち足した分は、保存していない変更として残す。
    savedSnapshot.current = sent;
    setDirty(isDirty());
  };

  return <>
    <section className="page-heading detail-page-heading">
      <div>
        <h2>本人情報</h2>
        <p>顧客本人の基本情報を管理します。</p>
      </div>
    </section>

    <section className="panel person-panel" aria-labelledby="person-information-title">
      <header className="panel-header">
        <div>
          <h3 id="person-information-title">基本情報</h3>
          <p>氏名・生年月日・担当情報・関連法人</p>
        </div>
        <CircleUserRound aria-hidden="true" />
      </header>
      {/* 担当者は一覧からクリック・Enter で選ぶので input イベントが来ない。click と keyup でも比べ直す。 */}
      <form ref={formRef} className="person-form" onSubmit={submit} onInput={scheduleDirtyCheck} onClick={scheduleDirtyCheck} onKeyUp={scheduleDirtyCheck}>
        <div className="person-form-grid">
          <label>氏名<span className="required-mark">必須</span><input name="name" required maxLength={100} defaultValue={household.name} autoComplete="name" /></label>
          <label>フリガナ<input name="nameKana" maxLength={100} defaultValue={household.nameKana} /></label>
          <div className="date-field">
            <label htmlFor="person-birth-date">生年月日</label>
            <DateInput id="person-birth-date" name="birthDate" label="生年月日" defaultMode="WAREKI" defaultValue={household.birthDate ?? ""} describedBy="person-birth-date-help" />
          </div>
          <label>顧客コード<span className="required-mark">必須</span><input name="clientCode" required maxLength={30} pattern="(?:[A-Za-z0-9_]|-)+" defaultValue={household.clientCode} /></label>
          <StaffSelect id="person-staff" defaultValue={household.staffId} defaultLabel={household.assignedStaff} />
          {/* 関連法人は任意。顧客一覧の検索対象になるだけで、計算や印刷には使わない。 */}
          <label>関連法人<input name="relatedCompany" maxLength={100} defaultValue={household.relatedCompany} placeholder="例：株式会社山田商店" /></label>
        </div>
        <div id="person-birth-date-help" className="person-reference-note">
          <CalendarDays aria-hidden="true" />
          <span>{household.birthDate ? `生年月日 ${dateJaWithWareki(household.birthDate)}${age === null ? "" : `／B/S基準日時点 ${age}歳`}` : "生年月日は未設定です。"}</span>
        </div>
        <footer className="person-form-footer">
          <button type="button" className="text-button danger-text-button" onClick={onRequestDelete} disabled={saving}><Trash2 />この顧客を削除</button>
          <div className="person-form-actions">
            {dirty
              ? <span className="person-save-status is-unsaved" role="status"><CircleAlert />保存していない変更があります</span>
              : saved ? <span className="person-save-status" role="status"><CircleCheck />保存しました</span> : null}
            <button type="submit" className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Save />}{saving ? "保存中" : "保存する"}</button>
          </div>
        </footer>
      </form>
    </section>
    <StaffHistory householdId={household.id} staffId={household.staffId} />
    {leaveGuard.confirming ? <LeaveConfirmModal subject="本人情報" onStay={leaveGuard.stay} onLeave={leaveGuard.leave} /> : null}
  </>;
}
