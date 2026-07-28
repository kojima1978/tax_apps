"use client";

import { CalendarDays, CircleCheck, CircleUserRound, LoaderCircle, Save, Trash2 } from "lucide-react";
import type { FormEvent } from "react";
import { ageOnDate } from "@/lib/family";
import { dateJa } from "@/lib/format";
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
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onRequestDelete: () => void;
}) {
  const age = ageOnDate(household.birthDate, referenceDate);

  return <>
    <section className="page-heading detail-page-heading">
      <div>
        <p className="eyebrow">PERSONAL INFORMATION</p>
        <h2>本人情報</h2>
        <p>顧客本人の基本情報を管理します。</p>
      </div>
    </section>

    <section className="panel person-panel" aria-labelledby="person-information-title">
      <header className="panel-header">
        <div>
          <h3 id="person-information-title">基本情報</h3>
          <p>氏名・生年月日・担当情報</p>
        </div>
        <CircleUserRound aria-hidden="true" />
      </header>
      <form className="person-form" onSubmit={onSubmit}>
        <div className="person-form-grid">
          <label>氏名<span className="required-mark">必須</span><input name="name" required maxLength={100} defaultValue={household.name} autoComplete="name" /></label>
          <label>フリガナ<input name="nameKana" maxLength={100} defaultValue={household.nameKana} /></label>
          <label>生年月日<input name="birthDate" type="date" defaultValue={household.birthDate ?? ""} aria-describedby="person-birth-date-help" /></label>
          <label>顧客コード<span className="required-mark">必須</span><input name="clientCode" required maxLength={30} pattern="(?:[A-Za-z0-9_]|-)+" defaultValue={household.clientCode} /></label>
          <label>担当者<input name="assignedStaff" maxLength={100} defaultValue={household.assignedStaff} placeholder="例：佐藤税理士" /></label>
        </div>
        <div id="person-birth-date-help" className="person-reference-note">
          <CalendarDays aria-hidden="true" />
          <span>{household.birthDate ? `生年月日 ${dateJa(household.birthDate)}${age === null ? "" : `／B/S基準日時点 ${age}歳`}` : "生年月日は未設定です。"}</span>
        </div>
        <footer className="person-form-footer">
          <button type="button" className="text-button danger-text-button" onClick={onRequestDelete} disabled={saving}><Trash2 />この顧客を削除</button>
          <div className="person-form-actions">
            {saved ? <span className="person-save-status" role="status"><CircleCheck />保存しました</span> : null}
            <button type="submit" className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Save />}{saving ? "保存中" : "保存する"}</button>
          </div>
        </footer>
      </form>
    </section>
  </>;
}
