// 案件を作る前に会社名と課税時期を訊くダイアログ。
//
// 2年目以降は「評価したことのある会社」から選ぶ。会社名を打ち直さないので、1文字違いで同じ
// 会社が2つの塊に割れることが無い（キーを持たない案件同士は会社名で寄せる。caseGroups.ts）。
// 選んだときはその会社の一番新しい年分を写し、同じ会社の年分としてサーバに会社キーを揃えさせる
// ── 画面にIDは出さない。利用者が覚えているのは会社名と課税時期だけなので、IDの列を出しても
// 探す手がかりにならず、打ち間違いの種が1つ増えるだけになる。

import { useState } from 'react';
import { ERA_OPTS, MONTH_OPTS, dayOptionsFor, yearOptionsFor } from '@/lib/wareki';
import {
  type CaseProfile,
  type NewCaseCompany,
  dropImpossibleParts,
  emptyCaseProfile,
  isCaseProfileReady,
  nextTaxPeriod,
} from './newCase';

interface NewCaseDialogProps {
  /** 選べる会社（年分のある会社だけ）。空なら会社の選択そのものを出さない。 */
  companies: readonly NewCaseCompany[];
  /** 会社が決まっている入口（年分の一覧の「この会社に年分を追加」）では選び直させない。 */
  fixedCompanyKey?: string;
  busy: boolean;
  onCancel: () => void;
  /** basedOn は写す元の案件（新しい会社なら null）。 */
  onSubmit: (profile: CaseProfile, basedOn: number | null) => void;
}

/** 様式のプルダウンと同じ選択肢を出す（値も様式の欄にそのまま入る）。 */
const Options = ({ values }: { values: readonly string[] }) => (
  <>{values.map((value) => <option key={value} value={value}>{value}</option>)}</>
);

export function NewCaseDialog({ companies, fixedCompanyKey, busy, onCancel, onSubmit }: NewCaseDialogProps) {
  const companyOf = (key: string) => companies.find((item) => item.key === key) ?? null;
  const profileOf = (key: string): CaseProfile => {
    const company = companyOf(key);
    return company === null
      ? emptyCaseProfile()
      // 前の年分から始めるので、課税時期は年だけ進めた形を出しておく（打ち直させない）。
      : { companyName: company.companyName, ...nextTaxPeriod(company.latestTaxPeriod) };
  };

  const [selected, setSelected] = useState(fixedCompanyKey ?? '');
  const [profile, setProfile] = useState(() => profileOf(fixedCompanyKey ?? ''));

  const based = companyOf(selected);
  const ready = isCaseProfileReady(profile);
  const title = fixedCompanyKey === undefined ? '新しい案件' : 'この会社に年分を追加';

  // 元号・月を変えたときに、その組み合わせに無くなった年・日は落とす（平成40年・2月31日を作らせない）
  const set = (patch: Partial<CaseProfile>) =>
    setProfile((prev) => dropImpossibleParts({ ...prev, ...patch }));

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || busy) return;
    onSubmit(profile, based?.latestId ?? null);
  };

  return (
    <div className="no-print app-modal-backdrop" onClick={onCancel}>
      <form
        className="app-modal new-case-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => { if (event.key === 'Escape') onCancel(); }}
        onSubmit={submit}
      >
        <h2 className="prereq-section-title new-case-title">{title}</h2>
        <p className="check-note">
          入れた会社名と課税時期はそのまま第1表の1の欄に入ります（あとから帳票で直せます）。
        </p>

        {fixedCompanyKey === undefined && companies.length > 0 && (
          <div className="new-case-field">
            <label className="new-case-label" htmlFor="new-case-company">会社</label>
            <select
              id="new-case-company"
              name="newCase.company"
              className="new-case-select"
              value={selected}
              disabled={busy}
              onChange={(event) => {
                setSelected(event.target.value);
                setProfile(profileOf(event.target.value));
              }}
            >
              <option value="">新しい会社</option>
              <optgroup label="評価したことのある会社">
                {companies.map((item) => (
                  <option key={item.key} value={item.key}>{item.companyName}</option>
                ))}
              </optgroup>
            </select>
          </div>
        )}

        <div className="new-case-field">
          <label className="new-case-label" htmlFor="new-case-name">会社名</label>
          {based === null ? (
            <input
              id="new-case-name"
              name="newCase.companyName"
              className="new-case-input"
              type="text"
              autoFocus
              value={profile.companyName}
              disabled={busy}
              onChange={(event) => set({ companyName: event.target.value })}
            />
          ) : (
            // 選んだ会社の名前は打ち直させない（打ち直すと1文字違いで別の会社になる）。
            <span className="new-case-fixed">{based.companyName}</span>
          )}
        </div>

        <div className="new-case-field">
          <label className="new-case-label" htmlFor="new-case-year">課税時期</label>
          <div className="new-case-date">
            <select id="new-case-era" name="newCase.era" value={profile.era} disabled={busy}
              onChange={(event) => set({ era: event.target.value })}><Options values={ERA_OPTS} /></select>
            <select id="new-case-year" name="newCase.year" value={profile.year} disabled={busy}
              onChange={(event) => set({ year: event.target.value })}><Options values={yearOptionsFor(profile.era, profile.year)} /></select>
            <span>年</span>
            <select id="new-case-month" name="newCase.month" value={profile.month} disabled={busy}
              onChange={(event) => set({ month: event.target.value })}><Options values={MONTH_OPTS} /></select>
            <span>月</span>
            <select id="new-case-day" name="newCase.day" value={profile.day} disabled={busy}
              onChange={(event) => set({ day: event.target.value })}><Options values={dayOptionsFor(profile.era, profile.year, profile.month, profile.day)} /></select>
            <span>日</span>
          </div>
        </div>

        {based !== null && (
          <p className="check-note new-case-note">
            {based.latestTaxPeriod === '' ? 'いまある年分' : `${based.latestTaxPeriod}の年分`}
            の内容を写します。会社の情報・株主構成・業種目番号・第5表の科目はそのまま、
            毎年入れ直すもの（第5表の金額・会社規模の判定・類似業種の株価）は空になります。
          </p>
        )}

        <div className="prereq-actions new-case-actions">
          {!ready && <span className="new-case-hint">会社名と課税時期の年を入れてください</span>}
          <button type="button" className="app-tool-btn" onClick={onCancel} disabled={busy}>やめる</button>
          <button type="submit" className="app-tool-btn" disabled={!ready || busy}>
            {based === null ? '案件を作る' : '年分を追加する'}
          </button>
        </div>
      </form>
    </div>
  );
}
