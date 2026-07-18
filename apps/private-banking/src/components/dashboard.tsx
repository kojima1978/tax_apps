"use client";

import dynamic from "next/dynamic";
import {
  AlertTriangle, ChevronRight, Clock3, History, Landmark, LayoutDashboard, Link2,
  LoaderCircle, Menu, Plus, Printer, RefreshCw, ShieldCheck, Trash2, WalletCards, X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

const AllocationChart = dynamic(() => import("./allocation-chart").then((m) => m.AllocationChart), {
  ssr: false,
  loading: () => <div className="chart-loading"><LoaderCircle className="spin" />グラフを準備中</div>,
});

type Position = {
  id: number; side: "ASSET" | "LIABILITY"; category: string; name: string; institution: string;
  currency: string; originalAmount: number; fxRate: number; valueJpy: number; liquidity: string;
  includedInNetWorth: boolean; valuationMethod: string; note: string;
};
type Snapshot = { id: number; label: string; asOfDate: string; isCurrent: boolean; positions: Position[] };
type Portfolio = {
  household: { id: number; name: string; currency: string };
  planning: {
    estimatedInheritanceTax: number; successionCosts: number; inheritanceTaxUpdatedAt: string | null;
    hasSpouse: boolean; heirRank: "none" | "rank1" | "rank2" | "rank3"; heirCount: number;
  };
  snapshots: Snapshot[];
};
type Tab = "overview" | "assets" | "history";
type BalanceMode = "current" | "forecast";

const API_BASE = "/private-banking/api";
const categoryLabels: Record<string, string> = {
  DEPOSIT: "預金・現金", SECURITIES: "有価証券", REAL_ESTATE: "不動産",
  PRIVATE_SHARES: "自社株・非上場株", INSURANCE: "生命保険", COLLECTIBLES: "実物資産",
  LOAN: "借入金", GUARANTEE: "個人保証",
};
const assetCategories = ["DEPOSIT", "SECURITIES", "REAL_ESTATE", "PRIVATE_SHARES", "INSURANCE", "COLLECTIBLES"];
const liabilityCategories = ["LOAN", "GUARANTEE"];
const yen = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 });
const compactYen = (value: number) => `${Math.round(value / 10000).toLocaleString("ja-JP")}万円`;
const dateJa = (date: string) => new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(new Date(`${date}T00:00:00`));

function majorClassification(position: Position) {
  if (position.category === "GUARANTEE") return "個人保証";
  return position.side === "ASSET" ? "資産" : "負債";
}

function middleClassification(position: Position) {
  if (position.category === "GUARANTEE") return "偶発債務（B/S外）";
  if (position.side === "ASSET") {
    if (position.liquidity === "HIGH") return "流動資産";
    if (position.liquidity === "MEDIUM") return "中流動性資産";
    return "固定資産";
  }
  if (position.liquidity === "HIGH") return "流動負債";
  if (position.liquidity === "MEDIUM") return "固定負債（中）";
  return "固定負債（低）";
}

function totals(positions: Position[]) {
  let assets = 0, liabilities = 0, guarantees = 0;
  for (const p of positions) {
    if (p.side === "ASSET") {
      assets += p.valueJpy;
    } else if (p.includedInNetWorth) liabilities += p.valueJpy;
    else guarantees += p.valueJpy;
  }
  return { assets, liabilities, guarantees, netWorth: assets - liabilities };
}

function classifiedTotals(positions: Position[]) {
  let currentAssets = 0, mediumAssets = 0, lowAssets = 0;
  let currentLiabilities = 0, mediumLiabilities = 0, lowLiabilities = 0, guarantees = 0;
  for (const position of positions) {
    if (position.side === "ASSET") {
      if (position.liquidity === "HIGH") currentAssets += position.valueJpy;
      else if (position.liquidity === "MEDIUM") mediumAssets += position.valueJpy;
      else lowAssets += position.valueJpy;
    } else if (!position.includedInNetWorth) {
      guarantees += position.valueJpy;
    } else if (position.liquidity === "HIGH") {
      currentLiabilities += position.valueJpy;
    } else if (position.liquidity === "MEDIUM") {
      mediumLiabilities += position.valueJpy;
    } else {
      lowLiabilities += position.valueJpy;
    }
  }
  return { currentAssets, mediumAssets, lowAssets, currentLiabilities, mediumLiabilities, lowLiabilities, guarantees };
}

function smallClassification(positions: Position[], side: Position["side"], liquidity: string) {
  const categories = new Set<string>();
  for (const position of positions) {
    if (position.side === side && position.liquidity === liquidity && position.category !== "GUARANTEE") {
      categories.add(categoryLabels[position.category] ?? position.category);
    }
  }
  return [...categories].join("・") || "該当なし";
}

export function Dashboard() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [balanceMode, setBalanceMode] = useState<BalanceMode>("current");
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(`${API_BASE}/portfolio`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      setPortfolio(await response.json());
    } catch {
      setError("データを読み込めませんでした。接続を確認してください。");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const current = portfolio?.snapshots.find((snapshot) => snapshot.isCurrent);
  const summary = useMemo(() => totals(current?.positions ?? []), [current]);
  const classified = useMemo(() => classifiedTotals(current?.positions ?? []), [current]);
  const smallClasses = useMemo(() => {
    const positions = current?.positions ?? [];
    return {
      highAssets: smallClassification(positions, "ASSET", "HIGH"),
      mediumAssets: smallClassification(positions, "ASSET", "MEDIUM"),
      lowAssets: smallClassification(positions, "ASSET", "LOW"),
      highLiabilities: smallClassification(positions, "LIABILITY", "HIGH"),
      mediumLiabilities: smallClassification(positions, "LIABILITY", "MEDIUM"),
      lowLiabilities: smallClassification(positions, "LIABILITY", "LOW"),
    };
  }, [current]);
  const allocation = useMemo(() => {
    const values = new Map<string, number>();
    for (const p of current?.positions ?? []) {
      if (p.side === "ASSET") values.set(p.category, (values.get(p.category) ?? 0) + p.valueJpy);
    }
    return [...values].map(([key, value]) => ({ name: categoryLabels[key] ?? key, value })).sort((a, b) => b.value - a.value);
  }, [current]);
  const estimatedInheritanceTax = portfolio?.planning.estimatedInheritanceTax ?? 0;
  const successionCosts = portfolio?.planning.successionCosts ?? 0;
  const hasInheritanceEstimate = portfolio?.planning.inheritanceTaxUpdatedAt !== null && portfolio?.planning.inheritanceTaxUpdatedAt !== undefined;
  const forecastAdjustments = estimatedInheritanceTax + successionCosts;
  const isForecast = balanceMode === "forecast";
  const displayedCurrentLiabilities = classified.currentLiabilities + (isForecast ? forecastAdjustments : 0);
  const displayedNetWorth = summary.netWorth - (isForecast ? forecastAdjustments : 0);
  const liquidityHeadroom = classified.currentAssets + classified.mediumAssets - summary.liabilities - forecastAdjustments;
  const forecastFlowDetails = [
    classified.currentLiabilities !== 0 ? smallClasses.highLiabilities : "",
    estimatedInheritanceTax !== 0 ? "想定相続税（予測）" : "",
    successionCosts !== 0 ? "承継関連費用（予測）" : "",
  ].filter(Boolean).join("・");

  async function addPosition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    try {
      const response = await fetch(`${API_BASE}/positions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error();
      setModalOpen(false);
      await load();
    } catch { setError("登録できませんでした。入力内容を確認してください。"); }
    finally { setSaving(false); }
  }

  async function deletePosition(id: number) {
    if (!window.confirm("この明細を削除しますか？")) return;
    const response = await fetch(`${API_BASE}/positions/${id}`, { method: "DELETE" });
    if (response.ok) await load(); else setError("削除できませんでした。");
  }

  async function saveSnapshot() {
    setSaving(true);
    const response = await fetch(`${API_BASE}/snapshots`, { method: "POST" });
    if (response.ok) await load(); else setError("履歴を保存できませんでした。");
    setSaving(false);
  }

  async function saveForecast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const action = form.get("action");
    try {
      const response = await fetch(`${API_BASE}/inheritance-estimate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      if (!response.ok) throw new Error();
      setForecastModalOpen(false);
      if (action === "calculate") window.location.assign("/inheritance-tax-app/?source=pb&autocalc=1");
      else await load();
    } catch { setError("予測条件を保存できませんでした。"); }
    finally { setSaving(false); }
  }

  if (!portfolio || !current) {
    return <main className="initial-loader"><div className="brand-mark"><Landmark /></div><LoaderCircle className="spin" /><p>{error || "ファミリーB/Sを読み込んでいます"}</p>{error ? <button className="button secondary" onClick={() => void load()}>再読み込み</button> : null}</main>;
  }

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">本文へ移動</a>
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand"><div className="brand-mark"><Landmark /></div><div><strong>PB Portfolio</strong><span>Family Balance Sheet</span></div></div>
        <button className="close-menu" aria-label="メニューを閉じる" onClick={() => setMenuOpen(false)}><X /></button>
        <nav aria-label="メインメニュー">
          <NavButton active={activeTab === "overview"} icon={<LayoutDashboard />} label="ダッシュボード" onClick={() => { setActiveTab("overview"); setMenuOpen(false); }} />
          <NavButton active={activeTab === "assets"} icon={<WalletCards />} label="資産・負債明細" onClick={() => { setActiveTab("assets"); setMenuOpen(false); }} />
          <NavButton active={activeTab === "history"} icon={<History />} label="履歴比較" onClick={() => { setActiveTab("history"); setMenuOpen(false); }} />
        </nav>
        <div className="side-section"><p>外部連携</p><a className="side-link" href="/inheritance-tax-app/?source=pb"><Link2 /><span>相続税シミュレーター</span><ChevronRight /></a></div>
        <div className="security-note"><ShieldCheck /><div><strong>ローカル環境</strong><span>データは社内DBで管理</span></div></div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="menu-button" aria-label="メニューを開く" onClick={() => setMenuOpen(true)}><Menu /></button>
          <div><p className="eyebrow">管理対象</p><h1>{portfolio.household.name}</h1></div>
          <div className="top-actions"><span className="as-of"><Clock3 />{dateJa(current.asOfDate)} 時点</span><button className="button secondary" onClick={() => window.print()}><Printer />PDF出力</button><button className="button primary" onClick={() => setModalOpen(true)}><Plus />明細を追加</button></div>
        </header>

        <main id="main-content" className="content">
          {error ? <div className="error-banner" role="alert"><AlertTriangle />{error}<button onClick={() => setError("")} aria-label="閉じる"><X /></button></div> : null}
          {activeTab === "overview" ? (
            <>
              <section className="page-heading"><div><p className="eyebrow">PERSONAL BALANCE SHEET</p><h2>資産全体を、一枚で。</h2><p>時価ベースの資産・負債と流動性を俯瞰します。</p></div><button className="text-button" disabled={saving} onClick={() => void saveSnapshot()}><RefreshCw className={saving ? "spin" : ""} />現在の状態を履歴保存</button></section>
              <section className="dashboard-grid">
                <article className="panel balance-panel">
                  <PanelHeader
                    title={isForecast ? "相続後予測B/S" : "ファミリーB/S"}
                    subtitle={isForecast ? "想定相続税を含む予測値／現在B/Sとは別管理" : "流動性 高・中・低／時価評価・円換算"}
                    action={<div className="scenario-actions"><div className="scenario-switch" role="group" aria-label="B/S表示切替"><button className={balanceMode === "current" ? "active" : ""} aria-pressed={balanceMode === "current"} onClick={() => setBalanceMode("current")}>現在</button><button className={balanceMode === "forecast" ? "active" : ""} aria-pressed={balanceMode === "forecast"} onClick={() => setBalanceMode("forecast")}>相続後予測</button></div>{isForecast ? <button className="text-button compact" onClick={() => setForecastModalOpen(true)}>予測条件</button> : null}</div>}
                  />
                  <div className="classified-bs" role="group" aria-label="流動・固定分類による貸借対照表">
                    <section className="classified-bs-side asset-side" aria-labelledby="assets-heading">
                      <h4 id="assets-heading"><span>資産の部</span></h4>
                      {classified.currentAssets !== 0 ? <div className="bs-account current-account" style={{ flexGrow: Math.max(classified.currentAssets, summary.assets * 0.12) }}>
                        <div><span>流動資産</span><small className="bs-subcategories">{smallClasses.highAssets}</small></div><strong>{compactYen(classified.currentAssets)}</strong>
                      </div> : null}
                      {classified.mediumAssets !== 0 ? <div className="bs-account medium-account" style={{ flexGrow: Math.max(classified.mediumAssets, summary.assets * 0.08) }}>
                        <div><span>中流動性資産</span><small className="bs-subcategories">{smallClasses.mediumAssets}</small></div><strong>{compactYen(classified.mediumAssets)}</strong>
                      </div> : null}
                      {classified.lowAssets !== 0 ? <div className="bs-account low-account" style={{ flexGrow: Math.max(classified.lowAssets, summary.assets * 0.08) }}>
                        <div><span>固定資産</span><small className="bs-subcategories">{smallClasses.lowAssets}</small></div><strong>{compactYen(classified.lowAssets)}</strong>
                      </div> : null}
                      <footer><span>資産合計</span><strong>{compactYen(summary.assets)}</strong></footer>
                    </section>
                    <section className="classified-bs-side funding-side" aria-labelledby="funding-heading">
                      <h4 id="funding-heading"><span>負債・純資産の部</span></h4>
                      {displayedCurrentLiabilities !== 0 ? <div className={`bs-account current-liability ${isForecast && forecastAdjustments !== 0 ? "forecast-account" : ""}`} style={{ flexGrow: Math.max(displayedCurrentLiabilities, summary.assets * 0.08) }}>
                        <div><span>流動負債{isForecast && forecastAdjustments !== 0 ? <em>予測</em> : null}</span><small className="bs-subcategories">{isForecast ? forecastFlowDetails : smallClasses.highLiabilities}</small></div><strong>{compactYen(displayedCurrentLiabilities)}</strong>
                      </div> : null}
                      {classified.mediumLiabilities !== 0 ? <div className="bs-account medium-liability" style={{ flexGrow: Math.max(classified.mediumLiabilities, summary.assets * 0.06) }}>
                        <div><span>固定負債（中）</span><small className="bs-subcategories">{smallClasses.mediumLiabilities}</small></div><strong>{compactYen(classified.mediumLiabilities)}</strong>
                      </div> : null}
                      {classified.lowLiabilities !== 0 ? <div className="bs-account low-liability" style={{ flexGrow: Math.max(classified.lowLiabilities, summary.assets * 0.06) }}>
                        <div><span>固定負債（低）</span><small className="bs-subcategories">{smallClasses.lowLiabilities}</small></div><strong>{compactYen(classified.lowLiabilities)}</strong>
                      </div> : null}
                      {displayedNetWorth !== 0 ? <div className="bs-account net-assets" style={{ flexGrow: Math.max(displayedNetWorth, summary.assets * 0.12) }}>
                        <div><span>純資産</span><small>資産 − 負債</small></div><strong>{compactYen(displayedNetWorth)}</strong>
                      </div> : null}
                      <footer><span>負債・純資産合計</span><strong>{compactYen(summary.liabilities + (isForecast ? forecastAdjustments : 0) + displayedNetWorth)}</strong></footer>
                    </section>
                  </div>
                  {isForecast ? <>{hasInheritanceEstimate ? <div className="liquidity-headroom"><div><span>納税後流動性余力</span><small>流動資産＋中流動性資産－負債－想定相続税－承継関連費用</small></div><strong className={liquidityHeadroom < 0 ? "negative" : ""}>{compactYen(liquidityHeadroom)}</strong></div> : null}{!hasInheritanceEstimate ? <p className="forecast-guidance">想定相続税が未連携のため、納税後流動性余力はまだ算出していません。<a href="/inheritance-tax-app/?source=pb">相続税を計算して連携</a></p> : <p className="classified-note">想定相続税 {compactYen(estimatedInheritanceTax)} は予測上の流動負債であり、現在の確定債務には含めていません。</p>}</> : <p className="classified-note">個人保証 {compactYen(classified.guarantees)} は偶発債務のため、貸借対照表の合計には含めていません。</p>}
                </article>
                <article className="panel allocation-panel">
                  <PanelHeader title="資産配分" subtitle="時価構成比" />
                  <div className="allocation-content"><AllocationChart data={allocation} /><div className="legend" role="list">{allocation.map((item, index) => <div key={item.name} role="listitem"><i className={`dot color-${index}`} /><span>{item.name}</span><strong>{summary.assets ? Math.round(item.value / summary.assets * 100) : 0}%</strong></div>)}</div></div>
                </article>
              </section>
              <section className="panel exposure-panel"><PanelHeader title="要確認事項" subtitle="B/S外の潜在リスク" /><div className="exposure"><div className="exposure-icon"><AlertTriangle /></div><div><span>個人保証残高</span><strong>{yen.format(summary.guarantees)}</strong><p>純資産には算入せず、偶発債務として別枠管理しています。</p></div><a className="button secondary" href="/inheritance-tax-app/?source=pb">相続税計算へ<Link2 /></a></div></section>
            </>
          ) : null}

          {activeTab === "assets" ? <AssetsView positions={current.positions} onAdd={() => setModalOpen(true)} onDelete={(id) => void deletePosition(id)} /> : null}
          {activeTab === "history" ? <HistoryView snapshots={portfolio.snapshots} onSave={() => void saveSnapshot()} saving={saving} /> : null}
        </main>
      </div>
      {menuOpen ? <button className="backdrop" aria-label="メニューを閉じる" onClick={() => setMenuOpen(false)} /> : null}
      {modalOpen ? <PositionModal onClose={() => setModalOpen(false)} onSubmit={addPosition} saving={saving} /> : null}
      {forecastModalOpen ? <ForecastModal planning={portfolio.planning} onClose={() => setForecastModalOpen(false)} onSubmit={saveForecast} saving={saving} /> : null}
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function PanelHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return <header className="panel-header"><div><h3>{title}</h3><p>{subtitle}</p></div>{action ?? null}</header>;
}

function AssetsView({ positions, onAdd, onDelete }: { positions: Position[]; onAdd: () => void; onDelete: (id: number) => void }) {
  const assets = positions.filter((p) => p.side === "ASSET");
  const liabilities = positions.filter((p) => p.side === "LIABILITY");
  return <><section className="page-heading"><div><p className="eyebrow">DETAILS</p><h2>資産・負債明細</h2><p>評価根拠と流動性を含む、現在の時価明細です。</p></div><button className="button primary" onClick={onAdd}><Plus />明細を追加</button></section><PositionTable title="資産の部" items={assets} onDelete={onDelete} /><PositionTable title="負債・偶発債務の部" items={liabilities} onDelete={onDelete} /></>;
}

function PositionTable({ title, items, onDelete }: { title: string; items: Position[]; onDelete: (id: number) => void }) {
  return <section className="panel table-panel"><PanelHeader title={title} subtitle={`${items.length}件`} /><div className="table-scroll"><table className="position-table"><thead><tr><th>区分</th><th>流動性区分</th><th>科目・名称</th><th>金融機関等</th><th>評価方法</th><th className="number">円換算時価</th><th aria-label="操作" /></tr></thead><tbody>{items.map((p) => <tr key={p.id}><td><span className="classification-label major">{majorClassification(p)}</span></td><td><span className="classification-label middle">{middleClassification(p)}</span></td><td><span className="category-tag">{categoryLabels[p.category]}</span><strong>{p.name}</strong>{!p.includedInNetWorth ? <small className="excluded">B/S外</small> : null}</td><td>{p.institution || "—"}</td><td>{p.valuationMethod}</td><td className="number"><strong>{yen.format(p.valueJpy)}</strong>{p.currency !== "JPY" ? <small>{p.originalAmount.toLocaleString()} {p.currency} × {p.fxRate}</small> : null}</td><td><button className="icon-button danger" aria-label={`${p.name}を削除`} onClick={() => onDelete(p.id)}><Trash2 /></button></td></tr>)}</tbody><tfoot><tr><td colSpan={5}>合計</td><td className="number">{yen.format(items.filter((p) => p.includedInNetWorth).reduce((sum, p) => sum + p.valueJpy, 0))}</td><td /></tr></tfoot></table></div></section>;
}

function HistoryView({ snapshots, onSave, saving }: { snapshots: Snapshot[]; onSave: () => void; saving: boolean }) {
  return <><section className="page-heading"><div><p className="eyebrow">HISTORY</p><h2>時点比較</h2><p>保存したB/Sを並べ、純資産の変化を追跡します。</p></div><button className="button primary" onClick={onSave} disabled={saving}><History />現在時点を保存</button></section><section className="panel table-panel"><div className="table-scroll"><table><thead><tr><th>基準日</th><th>状態</th><th className="number">資産合計</th><th className="number">負債合計</th><th className="number">純資産</th><th className="number">個人保証</th></tr></thead><tbody>{snapshots.map((snapshot) => { const s = totals(snapshot.positions); return <tr key={snapshot.id}><td><strong>{dateJa(snapshot.asOfDate)}</strong></td><td>{snapshot.isCurrent ? <span className="current-badge">現在</span> : snapshot.label}</td><td className="number">{yen.format(s.assets)}</td><td className="number">{yen.format(s.liabilities)}</td><td className="number emphasis">{yen.format(s.netWorth)}</td><td className="number">{yen.format(s.guarantees)}</td></tr>; })}</tbody></table></div></section></>;
}

function PositionModal({ onClose, onSubmit, saving }: { onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean }) {
  const [side, setSide] = useState<"ASSET" | "LIABILITY">("ASSET");
  const [category, setCategory] = useState("DEPOSIT");
  const [liquidity, setLiquidity] = useState<"HIGH" | "MEDIUM" | "LOW">("MEDIUM");

  function changeSide(nextSide: "ASSET" | "LIABILITY") {
    setSide(nextSide);
    setCategory(nextSide === "ASSET" ? "DEPOSIT" : "LOAN");
    setLiquidity("MEDIUM");
  }

  function changeCategory(nextCategory: string) {
    setCategory(nextCategory);
    if (nextCategory === "GUARANTEE") setLiquidity("LOW");
    else if (category === "GUARANTEE") setLiquidity("MEDIUM");
  }

  const middleOptions = side === "ASSET"
    ? [["HIGH", "流動資産"], ["MEDIUM", "中流動性資産"], ["LOW", "固定資産"]] as const
    : category === "GUARANTEE"
      ? [["LOW", "偶発債務（B/S外）"]] as const
      : [["HIGH", "流動負債"], ["MEDIUM", "固定負債（中）"], ["LOW", "固定負債（低）"]] as const;

  return <div className="modal-layer" role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header><div><p className="eyebrow">NEW POSITION</p><h2 id="modal-title">明細を追加</h2></div><button className="icon-button" aria-label="閉じる" onClick={onClose}><X /></button></header><form onSubmit={onSubmit}><fieldset className="classification-fieldset"><legend>区分</legend><div className="segment"><label><input type="radio" name="side" value="ASSET" checked={side === "ASSET"} onChange={() => changeSide("ASSET")} /><span>資産</span></label><label><input type="radio" name="side" value="LIABILITY" checked={side === "LIABILITY"} onChange={() => changeSide("LIABILITY")} /><span>負債・個人保証</span></label></div></fieldset><div className="form-grid"><label>流動性区分<select name="liquidity" value={liquidity} onChange={(event) => setLiquidity(event.target.value as "HIGH" | "MEDIUM" | "LOW")} required>{middleOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>科目<select name="category" value={category} onChange={(event) => changeCategory(event.target.value)} required>{(side === "ASSET" ? assetCategories : liabilityCategories).map((key) => <option key={key} value={key}>{categoryLabels[key]}</option>)}</select></label><label>名称<input name="name" required placeholder="例：普通預金" /></label><label>金融機関・保管先<input name="institution" placeholder="例：○○銀行" /></label><label>通貨<select name="currency" defaultValue="JPY"><option>JPY</option><option>USD</option><option>EUR</option><option>GBP</option><option>AUD</option><option>CHF</option></select></label><label>通貨建て金額<input name="originalAmount" type="number" min="0" step="0.01" required placeholder="0" /></label><label>円換算レート<input name="fxRate" type="number" min="0.000001" step="0.000001" defaultValue="1" required /></label><label>評価方法<input name="valuationMethod" defaultValue="手動入力" /></label><label className="full">メモ<textarea name="note" rows={3} placeholder="評価日、根拠資料など" /></label></div><footer><button type="button" className="button secondary" onClick={onClose}>キャンセル</button><button type="submit" className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Plus />}登録する</button></footer></form></div></div>;
}

function ForecastModal({ planning, onClose, onSubmit, saving }: { planning: Portfolio["planning"]; onClose: () => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; saving: boolean }) {
  const [hasSpouse, setHasSpouse] = useState(planning.hasSpouse);
  const [heirRank, setHeirRank] = useState<Portfolio["planning"]["heirRank"]>(planning.heirRank);

  function changeSpouse(nextHasSpouse: boolean) {
    setHasSpouse(nextHasSpouse);
    if (!nextHasSpouse && heirRank === "none") setHeirRank("rank1");
  }

  return <div className="modal-layer" role="presentation"><div className="modal forecast-modal" role="dialog" aria-modal="true" aria-labelledby="forecast-modal-title"><header><div><p className="eyebrow">INHERITANCE TAX</p><h2 id="forecast-modal-title">相続税計算の家族情報</h2></div><button className="icon-button" aria-label="閉じる" onClick={onClose}><X /></button></header><form onSubmit={onSubmit}><p className="form-intro">概算に必要な最小限の情報です。法定相続分で計算し、代襲相続などの詳細は計算画面で調整できます。</p><div className="family-form-grid"><label>配偶者<select name="hasSpouse" value={String(hasSpouse)} onChange={(event) => changeSpouse(event.target.value === "true")}><option value="false">なし</option><option value="true">あり</option></select></label><label>配偶者以外の相続人<select name="heirRank" value={heirRank} onChange={(event) => setHeirRank(event.target.value as Portfolio["planning"]["heirRank"])}><option value="rank1">子</option><option value="rank2">親・祖父母</option><option value="rank3">兄弟姉妹</option><option value="none" disabled={!hasSpouse}>なし</option></select></label>{heirRank !== "none" ? <label>人数<input name="heirCount" type="number" min="1" max="20" step="1" defaultValue={Math.max(1, planning.heirCount)} required /></label> : <input type="hidden" name="heirCount" value="0" />}</div><details className="advanced-forecast"><summary>金額を手動調整</summary><div className="form-grid"><label>想定相続税<input name="estimatedInheritanceTax" type="number" min="0" step="1" defaultValue={planning.estimatedInheritanceTax} required /></label><label>承継関連費用<input name="successionCosts" type="number" min="0" step="1" defaultValue={planning.successionCosts} required /></label></div></details>{planning.inheritanceTaxUpdatedAt ? <p className="sync-status">前回の税額連携：{new Intl.DateTimeFormat("ja-JP", { dateStyle: "medium", timeStyle: "short" }).format(new Date(planning.inheritanceTaxUpdatedAt))}</p> : null}<footer><button type="button" className="button secondary" onClick={onClose}>キャンセル</button><button type="submit" name="action" value="save" className="button secondary" disabled={saving}>保存のみ</button><button type="submit" name="action" value="calculate" className="button primary" disabled={saving}>{saving ? <LoaderCircle className="spin" /> : <Link2 />}保存して相続税を計算</button></footer></form></div></div>;
}
