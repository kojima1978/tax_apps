"use client";

import { AlertTriangle, Calculator, LoaderCircle } from "lucide-react";
import { ReactNode } from "react";
import { PanelHeader } from "@/components/panel-header";
import { type BalanceView } from "@/lib/balance-view";
import { compactYen, percent } from "@/lib/format";

const areaHeight = (value: number, total: number) => `${Math.abs(value) / Math.max(total, 1) * 100}%`;
const accountDensity = (value: number, total: number) => {
  const ratio = Math.abs(value) / Math.max(total, 1);
  if (ratio < 0.02) return "micro-account";
  if (ratio < 0.04) return "compact-account";
  return ratio < 0.22 ? "dense-account" : "";
};

function BsAmount({ value, total }: { value: number; total: number }) {
  return <><span className="bs-money">{compactYen(value)}</span><em className="bs-percent">{percent.format(value / Math.max(total, 1) * 100)}%</em></>;
}

function BsSubtotals({ items, total }: { items: ReadonlyArray<{ label: string; value: number }>; total: number }) {
  return <dl className="bs-subtotals">{items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd><BsAmount value={item.value} total={total} /></dd></div>)}</dl>;
}

/**
 * 貸借対照表1枚。区画の高さは金額比そのままなので、表示値の計算は `buildBalanceView` に寄せ、
 * ここは受け取った数値を描くだけにしている（税金なし・税金ありの2枚を同じ部品で出す）。
 */
export function BalanceSheetPanel({ view, headingSuffix, subtitle, ownerName, liabilities, guarantees, deemedBenefitMissingCount, action }: {
  view: BalanceView;
  headingSuffix: string;
  subtitle: string;
  ownerName: string | null;
  liabilities: number;
  guarantees: number;
  deemedBenefitMissingCount: number;
  action?: ReactNode;
}) {
  const { taxIncluded, displayedAssets, displayedAssetTotal, displayedTaxes, displayedSuccessionCosts, forecastAdjustments, displayedNetWorth, fundingAreaTotal, smallAreaItems, subtotals, clippedSubtotals } = view;

  return <article className={`panel balance-panel print-section-balance balance-report-${headingSuffix}`}>
    {ownerName ? <p className="balance-print-owner">{ownerName}</p> : null}
    <PanelHeader title="貸借対照表" subtitle={subtitle} action={action} />
    {taxIncluded && deemedBenefitMissingCount > 0 ? <p className="insurance-data-note" role="note"><AlertTriangle />死亡保険金・死亡退職金が未入力の明細 {deemedBenefitMissingCount}件は、税金ありB/Sでは0円として計算しています。</p> : null}
    <div className="classified-bs" role="group" aria-label={`貸借対照表・${taxIncluded ? "税金あり" : "税金なし"}`}>
      <section className="classified-bs-side asset-side" aria-labelledby={`assets-heading-${headingSuffix}`}>
        <h4 id={`assets-heading-${headingSuffix}`}><span>資産の部</span></h4>
        <div className="bs-account-area">
        {displayedAssets.financial !== 0 ? <div className={`bs-account financial-account grouped-account ${accountDensity(displayedAssets.financial, displayedAssetTotal)}`} style={{ height: areaHeight(displayedAssets.financial, displayedAssetTotal) }}>
          <div className="bs-account-heading"><span>金融資産</span><strong><BsAmount value={displayedAssets.financial} total={displayedAssetTotal} /></strong></div>
          <BsSubtotals items={subtotals.financial} total={displayedAssetTotal} />
        </div> : null}
        {displayedAssets.realEstate !== 0 ? <div className={`bs-account real-estate-account grouped-account ${accountDensity(displayedAssets.realEstate, displayedAssetTotal)}`} style={{ height: areaHeight(displayedAssets.realEstate, displayedAssetTotal) }}>
          <div className="bs-account-heading"><span>不動産</span><strong><BsAmount value={displayedAssets.realEstate} total={displayedAssetTotal} /></strong></div>
          <BsSubtotals items={subtotals.realEstate} total={displayedAssetTotal} />
        </div> : null}
        {displayedAssets.business !== 0 ? <div className={`bs-account business-account grouped-account ${accountDensity(displayedAssets.business, displayedAssetTotal)}`} style={{ height: areaHeight(displayedAssets.business, displayedAssetTotal) }}>
          <div className="bs-account-heading"><span>事業用資産</span><strong><BsAmount value={displayedAssets.business} total={displayedAssetTotal} /></strong></div>
          <BsSubtotals items={subtotals.business} total={displayedAssetTotal} />
        </div> : null}
        {displayedAssets.otherAssets !== 0 ? <div className={`bs-account other-account ${accountDensity(displayedAssets.otherAssets, displayedAssetTotal)}`} style={{ height: areaHeight(displayedAssets.otherAssets, displayedAssetTotal) }}><div><span>その他資産</span></div><strong><BsAmount value={displayedAssets.otherAssets} total={displayedAssetTotal} /></strong></div> : null}
        </div>
        <footer><span>資産合計</span><strong>{compactYen(displayedAssetTotal)}</strong></footer>
      </section>
      <section className="classified-bs-side funding-side" aria-labelledby={`funding-heading-${headingSuffix}`}>
        <h4 id={`funding-heading-${headingSuffix}`}><span>負債・純資産の部</span></h4>
        <div className="bs-account-area">
        {displayedTaxes !== 0 ? <div className={`bs-account tax-account grouped-account ${accountDensity(displayedTaxes, fundingAreaTotal)}`} style={{ height: areaHeight(displayedTaxes, fundingAreaTotal) }}>
          <div className="bs-account-heading"><span>税金</span><strong><BsAmount value={displayedTaxes} total={displayedAssetTotal} /></strong></div>
          <BsSubtotals items={subtotals.taxes} total={displayedAssetTotal} />
        </div> : null}
        {liabilities !== 0 ? <div className={`bs-account medium-liability grouped-account ${accountDensity(liabilities, fundingAreaTotal)}`} style={{ height: areaHeight(liabilities, fundingAreaTotal) }}>
          <div className="bs-account-heading"><span>借入金</span><strong><BsAmount value={liabilities} total={displayedAssetTotal} /></strong></div>
          <BsSubtotals items={subtotals.loans} total={displayedAssetTotal} />
        </div> : null}
        {displayedSuccessionCosts !== 0 ? <div className={`bs-account forecast-account ${accountDensity(displayedSuccessionCosts, fundingAreaTotal)}`} aria-label={`承継関連費用 ${compactYen(displayedSuccessionCosts)}`} style={{ height: areaHeight(displayedSuccessionCosts, fundingAreaTotal) }}><div><span>承継関連費用</span><small className="bs-subcategories">承継時の諸費用</small></div><strong><BsAmount value={displayedSuccessionCosts} total={displayedAssetTotal} /></strong></div> : null}
        {displayedNetWorth !== 0 ? <div className={`bs-account net-assets ${accountDensity(displayedNetWorth, fundingAreaTotal)}`} style={{ height: areaHeight(displayedNetWorth, fundingAreaTotal) }}>
          <div><span>純資産</span><small>{taxIncluded ? "資産 − 負債 − 税金等" : "資産 − 負債"}</small></div><strong><BsAmount value={displayedNetWorth} total={displayedAssetTotal} /></strong>
        </div> : null}
        </div>
        <footer><span>負債・純資産合計</span><strong>{compactYen(liabilities + forecastAdjustments + displayedNetWorth)}</strong></footer>
      </section>
    </div>
    {smallAreaItems.length > 0 ? <div className="bs-small-area-key" role="note" aria-label="小さい区画の補助表示">
      <span className="bs-small-area-key-title">小区画</span>
      {smallAreaItems.map((item) => <span className="bs-small-area-key-item" key={`${item.side}-${item.label}`}>
        <small>{item.side}</small><strong>{item.label}</strong><b>{compactYen(item.value)}</b><em>{percent.format(item.value / Math.max(displayedAssetTotal, 1) * 100)}%</em>
      </span>)}
    </div> : null}
    {clippedSubtotals.length > 0 ? <div className="bs-subtotal-note" role="note" aria-label="枠内に収まらない小分類の内訳">
      <span className="bs-subtotal-note-title">小分類の内訳</span>
      {clippedSubtotals.map((account) => <span className="bs-subtotal-note-item" key={`${account.side}-${account.label}`}>
        <strong>{account.label}</strong>
        <span>{account.items.map((item) => `${item.label} ${compactYen(item.value)}（${percent.format(item.value / Math.max(displayedAssetTotal, 1) * 100)}%）`).join("／")}</span>
      </span>)}
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
