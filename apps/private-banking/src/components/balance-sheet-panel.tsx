"use client";

import { AlertTriangle, Calculator, LoaderCircle } from "lucide-react";
import { ReactNode, useState } from "react";
import { PanelHeader } from "@/components/panel-header";
import { type BalanceView, type BsAccount, type BsCallout } from "@/lib/balance-view";
import { compactYen, percent } from "@/lib/format";

const areaHeight = (value: number, total: number) => `${Math.abs(value) / Math.max(total, 1) * 100}%`;
const accountDensity = (value: number, total: number) => {
  const ratio = Math.abs(value) / Math.max(total, 1);
  if (ratio < 0.02) return "micro-account";
  if (ratio < 0.04) return "compact-account";
  return ratio < 0.22 ? "dense-account" : "";
};
const percentOf = (value: number, total: number) => percent.format(value / Math.max(total, 1) * 100);
/** 注記番号は丸数字（①〜⑳）。それを超える件数は現実には無いが、念のため括弧つき数字で出す。 */
const calloutMark = (no: number) => no <= 20 ? String.fromCharCode(0x2460 + no - 1) : `(${no})`;

type CalloutHover = (key: string) => { onPointerEnter: () => void; onPointerLeave: () => void };

function BsAmount({ value, total }: { value: number; total: number }) {
  return <><span className="bs-money">{compactYen(value)}</span><em className="bs-percent">{percentOf(value, total)}%</em></>;
}

function BsSubtotals({ items, total }: { items: ReadonlyArray<{ label: string; value: number }>; total: number }) {
  return <dl className="bs-subtotals">{items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd><BsAmount value={item.value} total={total} /></dd></div>)}</dl>;
}

/** 区画1つ。小分類つき（items）と補足文つき（caption）の2種類を同じ部品で描く。 */
function BsAccountBlock({ account, areaTotal, amountTotal, hasCallout, active, hover }: {
  account: BsAccount;
  areaTotal: number;
  amountTotal: number;
  hasCallout: boolean;
  active: boolean;
  hover: CalloutHover;
}) {
  const className = ["bs-account", account.tone, account.items ? "grouped-account" : "", accountDensity(account.value, areaTotal), active ? "is-callout-active" : ""].filter(Boolean).join(" ");
  return <div className={className} style={{ height: areaHeight(account.value, areaTotal) }} {...(hasCallout ? hover(account.key) : {})}>
    {account.items
      ? <>
        <div className="bs-account-heading"><span>{account.label}</span><strong><BsAmount value={account.value} total={amountTotal} /></strong></div>
        <BsSubtotals items={account.items} total={amountTotal} />
      </>
      : <>
        <div><span>{account.label}</span>{account.caption ? <small className={account.captionClassName}>{account.caption}</small> : null}</div>
        <strong><BsAmount value={account.value} total={amountTotal} /></strong>
      </>}
  </div>;
}

/** 表の下の注記1件。区画と同じ色の帯・番号で対応を示し、内訳があれば字下げして並べる。 */
function BsCalloutNote({ callout, amountTotal, active, hover }: { callout: BsCallout; amountTotal: number; active: boolean; hover: CalloutHover }) {
  return <div className={`bs-callout-note ${callout.tone}${active ? " is-active" : ""}`} {...hover(callout.key)}>
    <div className="bs-callout-note-head"><b>{calloutMark(callout.no)}</b><strong>{callout.label}</strong><span className="bs-callout-note-amount"><BsAmount value={callout.value} total={amountTotal} /></span></div>
    {callout.items.length > 0 ? <BsSubtotals items={callout.items} total={amountTotal} /> : null}
  </div>;
}

/**
 * 貸借対照表1枚。区画の高さは金額比そのままなので、表示値の計算は `buildBalanceView` に寄せ、
 * ここは受け取った数値を描くだけにしている（税金なし・税金ありの2枚を同じ部品で出す）。
 * 面積が足りない区画は、区画に番号の印を付け、表の真下の同じ側へ注記を並べて補う。
 */
export function BalanceSheetPanel({ view, headingSuffix, subtitle, liabilities, guarantees, deemedBenefitMissingCount, action }: {
  view: BalanceView;
  headingSuffix: string;
  subtitle: string;
  liabilities: number;
  guarantees: number;
  deemedBenefitMissingCount: number;
  action?: ReactNode;
}) {
  const { taxIncluded, assetAccounts, fundingAccounts, callouts, displayedAssetTotal, forecastAdjustments, displayedNetWorth, fundingAreaTotal } = view;
  // 区画・番号の印・表の下の注記のどれに触れても、対応する組をまとめて強調する。
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const hover: CalloutHover = (key) => ({ onPointerEnter: () => setActiveKey(key), onPointerLeave: () => setActiveKey(null) });
  const sides = ([
    { side: "asset", headingId: `assets-heading-${headingSuffix}`, heading: "資産の部", accounts: assetAccounts, areaTotal: displayedAssetTotal, footerLabel: "資産合計", footerValue: displayedAssetTotal },
    { side: "funding", headingId: `funding-heading-${headingSuffix}`, heading: "負債・純資産の部", accounts: fundingAccounts, areaTotal: fundingAreaTotal, footerLabel: "負債・純資産合計", footerValue: liabilities + forecastAdjustments + displayedNetWorth },
  ] as const).map((entry) => ({ ...entry, callouts: callouts.filter((callout) => callout.side === entry.side) }));

  return <article className={`panel balance-panel print-section-balance balance-report-${headingSuffix}`}>
    <PanelHeader title="貸借対照表" subtitle={subtitle} action={action} />
    {taxIncluded && deemedBenefitMissingCount > 0 ? <p className="insurance-data-note" role="note"><AlertTriangle />死亡保険金・死亡退職金が未入力の明細 {deemedBenefitMissingCount}件は、税金ありB/Sでは0円として計算しています。</p> : null}
    <div className="classified-bs" role="group" aria-label={`貸借対照表・${taxIncluded ? "税金あり" : "税金なし"}`}>
      {sides.map((entry) => <section key={entry.side} className={`classified-bs-side ${entry.side}-side`} aria-labelledby={entry.headingId}>
        <h4 id={entry.headingId}><span>{entry.heading}</span></h4>
        <div className="bs-account-area">
          {entry.accounts.map((account) => <BsAccountBlock key={account.key} account={account} areaTotal={entry.areaTotal} amountTotal={displayedAssetTotal} hasCallout={entry.callouts.some((callout) => callout.key === account.key)} active={account.key === activeKey} hover={hover} />)}
          {entry.callouts.map((callout) => <span key={callout.key} className={`bs-callout-marker${callout.key === activeKey ? " is-active" : ""}`} style={{ top: `${callout.anchor}%` }} aria-hidden="true" {...hover(callout.key)}>{calloutMark(callout.no)}</span>)}
        </div>
        <footer><span>{entry.footerLabel}</span><strong>{compactYen(entry.footerValue)}</strong></footer>
      </section>)}
    </div>
    {callouts.length > 0 ? <div className="bs-callout-notes" role="note" aria-label="小さい区画・枠内に収まらない内訳の注記">
      {sides.map((entry) => <div key={entry.side} className={`bs-callout-column ${entry.side}-notes`}>
        {entry.callouts.length > 0 ? <>
          <span className="bs-callout-column-title">{entry.heading}</span>
          {entry.callouts.map((callout) => <BsCalloutNote key={callout.key} callout={callout} amountTotal={displayedAssetTotal} active={callout.key === activeKey} hover={hover} />)}
        </> : null}
      </div>)}
    </div> : null}
    <p className="guarantee-note" role="note">※ 個人保証残高（B/S外）：<strong>{compactYen(guarantees)}</strong></p>
  </article>;
}

/** 貸借対照表パネルのヘッダー右側。シナリオ切替と、現在年度だけ出す税金の操作をまとめる。 */
export function BalanceScenarioActions({ taxIncluded, isCurrent, taxApiStatus, onSelectScenario, onCalculateTax, onOpenForecast }: {
  taxIncluded: boolean;
  isCurrent: boolean;
  taxApiStatus: "idle" | "loading" | "success";
  onSelectScenario: (scenario: "without-tax" | "with-tax") => void;
  onCalculateTax: () => void;
  onOpenForecast: () => void;
}) {
  return <div className="balance-panel-actions">
    <div className="balance-scenario-switch" role="group" aria-label="貸借対照表の表示パターン">
      <button type="button" aria-pressed={!taxIncluded} onClick={() => onSelectScenario("without-tax")}><span>税金なし</span><small>メイン</small></button>
      <button type="button" aria-pressed={taxIncluded} onClick={() => onSelectScenario("with-tax")}><span>税金あり</span><small>サブ</small></button>
    </div>
    {isCurrent ? <>
      <button className="text-button compact tax-api-button" type="button" onClick={onCalculateTax} disabled={taxApiStatus === "loading"} aria-live="polite">{taxApiStatus === "loading" ? <LoaderCircle className="spin" /> : <Calculator />}{taxApiStatus === "success" ? "連携しました" : taxApiStatus === "loading" ? "計算中" : "APIで相続税を計算"}</button>
      <button className="text-button compact" type="button" onClick={onOpenForecast}>税金を入力</button>
    </> : null}
  </div>;
}
