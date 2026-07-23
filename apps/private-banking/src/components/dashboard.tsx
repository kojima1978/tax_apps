"use client";

import {
  AlertTriangle, ChevronLeft, ChevronRight, Clock3, DatabaseBackup, History, LayoutDashboard, Link2,
  LoaderCircle, Menu, PanelLeftClose, PanelLeftOpen, Pencil, Printer, ShieldCheck, WalletCards, X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BackupView } from "@/components/backup-view";
import { BulkPositionModal } from "@/components/bulk-position-modal";
import {
  ClientDeleteModal, ClientEditModal, DeleteSnapshotModal, ForecastModal, PrintGuideModal, SnapshotTaxModal, YearCreationModal,
} from "@/components/dashboard-modals";
import { HistoryView } from "@/components/history-view";
import { PanelHeader } from "@/components/panel-header";
import { PortalLink } from "@/components/portal-link";
import { DeletePositionModal, PositionModal } from "@/components/position-modal";
import { AssetsView } from "@/components/positions-view";
import { API_BASE } from "@/lib/api";
import { ClientSummary } from "@/lib/clients";
import { compactYen, dateJa, percent, unformatNumberInput } from "@/lib/format";
import {
  type BalanceScenario,
  type BulkModalMode,
  type BulkPositionPayload,
  type Portfolio,
  type Position,
  type PositionSection,
  type PrintSection,
  type Section,
  type Snapshot,
  fiscalYearLabel,
  totals,
} from "@/lib/portfolio-view";

/** サイドバーのメニュー。key はそのまま URL の `/customers/<id>/<key>` になる。 */
const SECTIONS = [
  { key: "balance", label: "貸借対照表", icon: LayoutDashboard },
  { key: "positions", label: "資産・負債明細", icon: WalletCards },
  { key: "history", label: "年度比較", icon: History },
  { key: "backup", label: "バックアップ", icon: DatabaseBackup },
] as const satisfies ReadonlyArray<{ key: Section; label: string; icon: typeof LayoutDashboard }>;

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

export function Dashboard({ householdId, section }: { householdId: number; section: Section }) {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [balanceScenario, setBalanceScenario] = useState<BalanceScenario>("without-tax");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalMode, setBulkModalMode] = useState<BulkModalMode | null>(null);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [deletingPosition, setDeletingPosition] = useState<Position | null>(null);
  const [deletingSnapshot, setDeletingSnapshot] = useState<Snapshot | null>(null);
  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const searchParams = useSearchParams();
  // 明細で開いている年度は URL のクエリで持ち、画面を移動しても選択が残るようにする。
  const workingSnapshotId = Number(searchParams.get("snapshot")) || null;
  const [yearCreationSourceId, setYearCreationSourceId] = useState<number | null>(null);
  const [snapshotTaxModalOpen, setSnapshotTaxModalOpen] = useState(false);
  const [printGuideOpen, setPrintGuideOpen] = useState(false);
  const [printSections, setPrintSections] = useState<Set<PrintSection> | null>(null);
  const [clientEditOpen, setClientEditOpen] = useState(false);
  const [clientDeleteOpen, setClientDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(`${API_BASE}/portfolio?householdId=${householdId}`, { cache: "no-store" });
      // URL の顧客が存在しない場合は一覧へ戻して選び直してもらう。
      if (response.status === 404) { router.replace("/"); return; }
      if (!response.ok) throw new Error();
      setPortfolio(await response.json() as Portfolio);
    } catch {
      setError("データを読み込めませんでした。接続を確認してください。");
    }
  }, [householdId, router]);

  // 顧客が変わったときだけ、安定したローダー経由で読み直す。
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const current = portfolio?.snapshots.find((snapshot) => snapshot.isCurrent);
  const workingSnapshot = portfolio?.snapshots.find((snapshot) => snapshot.id === workingSnapshotId) ?? current;
  const summary = useMemo(() => totals(workingSnapshot?.positions ?? []), [workingSnapshot]);
  const successionAssets = useMemo(() => {
    let deposits = 0, securities = 0, insurance = 0, insuranceDeathBenefit = 0, insuranceDeathBenefitMissingCount = 0, privateShares = 0, businessAssets = 0, loanReceivables = 0;
    let homeRealEstate = 0, incomeRealEstate = 0, idleRealEstate = 0, otherAssets = 0;
    for (const position of workingSnapshot?.positions ?? []) {
      if (position.side !== "ASSET") continue;
      if (position.category === "DEPOSIT") deposits += position.valueJpy;
      else if (position.category === "SECURITIES") securities += position.valueJpy;
      else if (position.category === "INSURANCE") {
        insurance += position.valueJpy;
        const deathBenefit = position.assetDetails?.deathBenefit;
        if (deathBenefit === undefined || deathBenefit === null || deathBenefit <= 0) insuranceDeathBenefitMissingCount += 1;
        else insuranceDeathBenefit += Math.round(deathBenefit * position.fxRate);
      }
      else if (position.category === "PRIVATE_SHARES") privateShares += position.valueJpy;
      else if (position.category === "BUSINESS_ASSETS") businessAssets += position.valueJpy;
      else if (position.category === "LOAN_RECEIVABLE") loanReceivables += position.valueJpy;
      else if (position.category === "HOME_REAL_ESTATE") homeRealEstate += position.valueJpy;
      else if (position.category === "REAL_ESTATE") incomeRealEstate += position.valueJpy;
      else if (position.category === "IDLE_REAL_ESTATE") idleRealEstate += position.valueJpy;
      else otherAssets += position.valueJpy;
    }
    return {
      financial: deposits + securities + insurance,
      deposits, securities, insurance, insuranceDeathBenefit, insuranceDeathBenefitMissingCount,
      business: privateShares + businessAssets + loanReceivables,
      privateShares, businessAssets, loanReceivables,
      realEstate: homeRealEstate + incomeRealEstate + idleRealEstate,
      homeRealEstate, incomeRealEstate, idleRealEstate, otherAssets,
    };
  }, [workingSnapshot]);
  const loanBreakdown = useMemo(() => {
    let home = 0, investmentProperty = 0, securities = 0, business = 0, other = 0;
    for (const position of workingSnapshot?.positions ?? []) {
      if (position.side !== "LIABILITY" || !position.includedInNetWorth) continue;
      if (position.category === "LOAN_HOME") home += position.valueJpy;
      else if (position.category === "LOAN_INVESTMENT_PROPERTY") investmentProperty += position.valueJpy;
      else if (position.category === "LOAN_SECURITIES") securities += position.valueJpy;
      else if (position.category === "LOAN_BUSINESS") business += position.valueJpy;
      else other += position.valueJpy;
    }
    return { home, investmentProperty, securities, business, other };
  }, [workingSnapshot]);
  // 税金は年度ごとに保存している（承継関連費用だけは顧客単位）。
  const estimatedInheritanceTax = workingSnapshot?.estimatedInheritanceTax ?? 0;
  const otherTaxes = workingSnapshot?.otherTaxes ?? 0;
  const successionCosts = portfolio?.planning.successionCosts ?? 0;
  const totalTaxes = estimatedInheritanceTax + otherTaxes;
  function balanceView(scenario: BalanceScenario) {
    const taxIncluded = scenario === "with-tax";
    const displayedInsurance = taxIncluded ? successionAssets.insuranceDeathBenefit : successionAssets.insurance;
    const displayedAssets = {
      ...successionAssets,
      insurance: displayedInsurance,
      financial: successionAssets.deposits + successionAssets.securities + displayedInsurance,
    };
    const displayedAssetTotal = summary.assets - successionAssets.insurance + displayedInsurance;
    const displayedTaxes = taxIncluded ? totalTaxes : 0;
    const displayedSuccessionCosts = taxIncluded ? successionCosts : 0;
    const forecastAdjustments = displayedTaxes + displayedSuccessionCosts;
    const displayedNetWorth = displayedAssetTotal - summary.liabilities - forecastAdjustments;
    const fundingAreaTotal = summary.liabilities + forecastAdjustments + Math.abs(displayedNetWorth);
    const smallAreaItems = [
      { side: "資産", label: "金融資産", value: displayedAssets.financial, areaTotal: displayedAssetTotal },
      { side: "資産", label: "不動産", value: displayedAssets.realEstate, areaTotal: displayedAssetTotal },
      { side: "資産", label: "事業用資産", value: displayedAssets.business, areaTotal: displayedAssetTotal },
      { side: "資産", label: "その他資産", value: displayedAssets.otherAssets, areaTotal: displayedAssetTotal },
      { side: "負債・純資産", label: "税金", value: displayedTaxes, areaTotal: fundingAreaTotal },
      { side: "負債・純資産", label: "借入金", value: summary.liabilities, areaTotal: fundingAreaTotal },
      { side: "負債・純資産", label: "承継関連費用", value: displayedSuccessionCosts, areaTotal: fundingAreaTotal },
      { side: "負債・純資産", label: "純資産", value: displayedNetWorth, areaTotal: fundingAreaTotal },
    ].filter((item) => item.value !== 0 && Math.abs(item.value) / Math.max(item.areaTotal, 1) < 0.04);
    return { taxIncluded, displayedAssets, displayedAssetTotal, displayedTaxes, displayedSuccessionCosts, forecastAdjustments, displayedNetWorth, fundingAreaTotal, smallAreaItems };
  }

  function openNewPosition() {
    setEditingPosition(null);
    setModalOpen(true);
  }

  function openEditPosition(position: Position) {
    setEditingPosition(position);
    setModalOpen(true);
  }

  function closePositionModal() {
    setModalOpen(false);
    setEditingPosition(null);
  }

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/clients`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(new FormData(event.currentTarget).entries()), id: householdId }),
      });
      const result = await response.json().catch(() => null) as (ClientSummary & { error?: string }) | null;
      if (!response.ok || !result) throw new Error(result?.error ?? "顧客情報を保存できませんでした。");
      setClientEditOpen(false);
      await load();
    } catch (clientError) {
      setError(clientError instanceof Error ? clientError.message : "顧客情報を保存できませんでした。");
    } finally {
      setSaving(false);
    }
  }

  async function deleteClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/clients`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: householdId, confirmationClientCode: new FormData(event.currentTarget).get("confirmationClientCode") }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "顧客を削除できませんでした。");
      // 削除した顧客のURLに留まらないよう、一覧へ戻す。
      router.replace("/");
    } catch (clientError) {
      setError(clientError instanceof Error ? clientError.message : "顧客を削除できませんでした。");
      setSaving(false);
    }
  }

  async function savePosition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const fields = Object.fromEntries(form.entries()) as Record<string, unknown>;
    for (const fieldName of ["originalAmount", "fxRate", "valuationQuantity", "valuationUnitPrice", "adjustmentRate", "landArea", "roadsideValue", "fixedAssetTaxValue", "valuationMultiplier", "ownershipNumerator", "ownershipDenominator"]) {
      if (fieldName in fields) fields[fieldName] = unformatNumberInput(fields[fieldName] as FormDataEntryValue | undefined) ?? "";
    }
    const numericDetailFields = new Set(["deathBenefit", "totalIssuedShares", "interestRate", "floorArea"]);
    const assetDetails: Record<string, string | number> = {};
    for (const [fieldName, rawValue] of Object.entries(fields)) {
      if (!fieldName.startsWith("assetDetail.")) continue;
      const detailName = fieldName.slice("assetDetail.".length);
      const value = String(rawValue).trim();
      if (value !== "") {
        assetDetails[detailName] = numericDetailFields.has(detailName)
          ? Number(value.replace(/,/g, ""))
          : value;
      }
      delete fields[fieldName];
    }
    fields.assetDetails = assetDetails;
    const body = {
      ...fields,
      snapshotId: workingSnapshot?.id,
    };
    try {
      const response = await fetch(
        editingPosition ? `${API_BASE}/positions/${editingPosition.id}` : `${API_BASE}/positions`,
        { method: editingPosition ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
      );
      if (!response.ok) throw new Error();
      closePositionModal();
      await load();
    } catch { setError(editingPosition ? "修正できませんでした。入力内容を確認してください。" : "登録できませんでした。入力内容を確認してください。"); }
    finally { setSaving(false); }
  }

  async function saveBulkPositions(positions: BulkPositionPayload[], mode: BulkModalMode) {
    if (!workingSnapshot) return false;
    setSaving(true); setError("");
    try {
      const response = await fetch(`${API_BASE}/positions/bulk`, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotId: workingSnapshot.id, positions }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? (mode === "edit" ? "一括修正できませんでした。入力内容を確認してください。" : "一括登録できませんでした。入力内容を確認してください。"));
      setBulkModalMode(null);
      await load();
      return true;
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : mode === "edit" ? "一括修正できませんでした。" : "一括登録できませんでした。");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function deletePosition() {
    if (!deletingPosition) return;
    setSaving(true); setError("");
    const response = await fetch(`${API_BASE}/positions/${deletingPosition.id}`, { method: "DELETE" });
    if (response.ok) {
      setDeletingPosition(null);
      await load();
    } else {
      setError("削除できませんでした。");
    }
    setSaving(false);
  }

  async function reorderPositions(snapshotId: number, section: PositionSection, orderedIds: number[]) {
    setSaving(true); setError("");
    try {
      const response = await fetch(`${API_BASE}/positions/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotId, section, orderedIds }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "並び順を保存できませんでした。");
      await load();
      return true;
    } catch (error) {
      setError(error instanceof Error ? error.message : "並び順を保存できませんでした。");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function deleteSnapshot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deletingSnapshot) return;
    setSaving(true); setError("");
    try {
      const confirmationFiscalYear = new FormData(event.currentTarget).get("confirmationFiscalYear");
      const response = await fetch(`${API_BASE}/snapshots/${deletingSnapshot.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationFiscalYear }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "年度データを削除できませんでした。");
      setDeletingSnapshot(null);
      // 削除した年度を URL に残さない。
      if (workingSnapshotId === deletingSnapshot.id) router.replace(`/customers/${householdId}/${section}`);
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : "年度データを削除できませんでした。");
    } finally {
      setSaving(false);
    }
  }

  async function saveSnapshot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const body = Object.fromEntries(new FormData(event.currentTarget).entries());
      const response = await fetch(`${API_BASE}/snapshots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => null) as { error?: string; existingSnapshotId?: number } | null;
      if (response.status === 409 && result?.existingSnapshotId) {
        setYearCreationSourceId(null);
        editSnapshot(result.existingSnapshotId);
        setError(`${result.error} 既存年度を表示しました。`);
        return;
      }
      if (!response.ok) throw new Error(result?.error ?? "年度を作成できませんでした。");
      setYearCreationSourceId(null);
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : "年度を作成できませんでした。");
    } finally {
      setSaving(false);
    }
  }

  async function saveSnapshotTaxes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workingSnapshot) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`${API_BASE}/snapshots/${workingSnapshot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())),
      });
      if (!response.ok) throw new Error();
      setSnapshotTaxModalOpen(false);
      await load();
    } catch { setError("税金を修正できませんでした。"); }
    finally { setSaving(false); }
  }

  // 貸借対照表と明細は同じ年度を見せたいので、?snapshot= を引き継ぐ。
  const snapshotAwareSections: Section[] = ["balance", "positions"];
  const sectionHref = (target: Section, snapshotId: number | null = workingSnapshotId) =>
    `/customers/${householdId}/${target}${snapshotAwareSections.includes(target) && snapshotId ? `?snapshot=${snapshotId}` : ""}`;

  function editSnapshot(snapshotId: number) {
    router.push(sectionHref("positions", snapshotId));
  }

  async function saveForecast(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!portfolio) return;
    setSaving(true); setError("");
    const form = new FormData(event.currentTarget);
    const action = form.get("action");
    try {
      const response = await fetch(`${API_BASE}/inheritance-estimate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(form.entries()), householdId: portfolio.household.id }),
      });
      if (!response.ok) throw new Error();
      setForecastModalOpen(false);
      if (action === "calculate") window.location.assign(`/inheritance-tax-app/?source=pb&autocalc=1&householdId=${portfolio.household.id}`);
      else await load();
    } catch { setError("予測条件を保存できませんでした。"); }
    finally { setSaving(false); }
  }

  if (!portfolio || !current) {
    return <main className="initial-loader"><PortalLink /><LoaderCircle className="spin" /><p>{error || "貸借対照表を読み込んでいます"}</p>{error ? <button className="button secondary" onClick={() => void load()}>再読み込み</button> : null}</main>;
  }
  // 表示中の年度。?snapshot= が無効なときは現在年度にフォールバックする。
  const reportSnapshot = workingSnapshot ?? current;

  return (
    <div className="app-shell">
      <a href="#main-content" className="skip-link">本文へ移動</a>
      <aside className={`sidebar ${menuOpen ? "open" : ""} ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="brand"><PortalLink /><span>Personal Asset Balance Sheet</span></div>
        <button className="sidebar-toggle" aria-label={sidebarCollapsed ? "サイドバーを展開" : "サイドバーを折りたたむ"} aria-expanded={!sidebarCollapsed} onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}>{sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</button>
        <button className="close-menu" aria-label="メニューを閉じる" onClick={() => setMenuOpen(false)}><X /></button>
        <nav aria-label="メインメニュー">
          {SECTIONS.map(({ key, label, icon: Icon }) => <Link
            key={key}
            className={`nav-button ${section === key ? "active" : ""}`}
            href={sectionHref(key)}
            aria-current={section === key ? "page" : undefined}
            aria-label={label}
            title={label}
            onClick={() => setMenuOpen(false)}
          ><Icon /><span>{label}</span></Link>)}
        </nav>
        <div className="side-section"><p>外部連携</p><a className="side-link" href={`/inheritance-tax-app/?source=pb&householdId=${portfolio.household.id}`} aria-label="相続税シミュレーター" title="相続税シミュレーター"><Link2 /><span>相続税シミュレーター</span><ChevronRight /></a></div>
        <div className="security-note"><ShieldCheck /><div><strong>ローカル環境</strong><span>データは社内DBで管理</span></div></div>
      </aside>

      <div className={`main-area ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
        <header className="topbar">
          <button className="menu-button" aria-label="メニューを開く" onClick={() => setMenuOpen(true)}><Menu /></button>
          <div className="topbar-subject">
            <Link className="back-to-list" href="/"><ChevronLeft />一覧に戻る</Link>
            <button type="button" className="client-switcher-trigger" onClick={() => { setError(""); setClientEditOpen(true); }} aria-label={`顧客情報を編集。現在は${portfolio.household.name}`} aria-haspopup="dialog"><span><strong>{portfolio.household.name}</strong><em>{portfolio.household.clientCode}{portfolio.household.assignedStaff ? `・担当 ${portfolio.household.assignedStaff}` : ""}</em></span><Pencil /></button>
          </div>
          <div className="top-actions"><span className="as-of" aria-label={`${reportSnapshot.isCurrent ? "現在" : fiscalYearLabel(reportSnapshot)}のB/S基準日 ${dateJa(reportSnapshot.asOfDate)}`}><Clock3 /><small>{reportSnapshot.isCurrent ? "現在B/S基準日" : `${fiscalYearLabel(reportSnapshot)}基準日`}</small><strong>{dateJa(reportSnapshot.asOfDate)}</strong></span><button className="button secondary" onClick={() => setPrintGuideOpen(true)}><Printer />印刷・PDF出力</button></div>
        </header>

        <main id="main-content" className="content">
          {error ? <div className="error-banner" role="alert"><AlertTriangle />{error}<button onClick={() => setError("")} aria-label="閉じる"><X /></button></div> : null}
          {(section === "balance" || printSections?.has("balance")) ? (
            <div className={`report-document ${section !== "balance" ? "print-only-document" : ""} ${printSections && !printSections.has("balance") ? "print-excluded-document" : ""}`}>
              <section className="page-heading detail-page-heading">
                <div>
                  <p className="eyebrow">OWNER PERSONAL BALANCE SHEET</p>
                  <p>個人資産・負債を時価で俯瞰します。</p>
                  {reportSnapshot.isCurrent ? null : <p className="detail-heading-meta"><span className="detail-status historical">過年度を表示中</span><span>基準日 {dateJa(reportSnapshot.asOfDate)}</span></p>}
                </div>
                <div className="page-heading-actions detail-page-actions">
                  <label className="detail-year-selector"><span>表示年度</span><select aria-label="貸借対照表の表示年度" value={reportSnapshot.id} onChange={(event) => router.replace(sectionHref("balance", Number(event.target.value)))}>{[...portfolio.snapshots].sort((a, b) => b.fiscalYear - a.fiscalYear).map((item) => <option key={item.id} value={item.id}>{fiscalYearLabel(item)}{item.isCurrent ? "（現在）" : ""}</option>)}</select></label>
                </div>
              </section>
              <section className={`dashboard-grid balance-report-series screen-${balanceScenario}`}>
                {(printSections?.has("balance") ? (["without-tax", "with-tax"] as const) : [balanceScenario]).map((reportScenario) => {
                  const { taxIncluded, displayedAssets, displayedAssetTotal, displayedTaxes, displayedSuccessionCosts, forecastAdjustments, displayedNetWorth, fundingAreaTotal, smallAreaItems } = balanceView(reportScenario);
                  const headingSuffix = reportScenario === "with-tax" ? "with-tax" : "without-tax";
                  return <article key={reportScenario} className={`panel balance-panel print-section-balance balance-report-${headingSuffix}`}>
                  {reportScenario === "with-tax" ? <p className="balance-print-owner">{portfolio.household.name}</p> : null}
                  <PanelHeader
                    title="貸借対照表"
                    subtitle={`${reportSnapshot.isCurrent ? "" : `${fiscalYearLabel(reportSnapshot)}・`}${taxIncluded ? "相続時予測（死亡保険金・税金を反映）" : "現在価値（保険は解約返戻金）"}`}
                    action={reportScenario === balanceScenario ? <div className="balance-panel-actions"><div className="balance-scenario-switch" role="group" aria-label="貸借対照表の表示パターン"><button type="button" aria-pressed={!taxIncluded} onClick={() => setBalanceScenario("without-tax")}><span>税金なし</span><small>メイン</small></button><button type="button" aria-pressed={taxIncluded} onClick={() => setBalanceScenario("with-tax")}><span>税金あり</span><small>サブ</small></button></div>{reportSnapshot.isCurrent ? <button className="text-button compact" onClick={() => setForecastModalOpen(true)}>予測条件</button> : null}</div> : undefined}
                  />
                  {taxIncluded && successionAssets.insuranceDeathBenefitMissingCount > 0 ? <p className="insurance-data-note" role="note"><AlertTriangle />死亡保険金が未入力の保険 {successionAssets.insuranceDeathBenefitMissingCount}件は、税金ありB/Sでは0円として計算しています。</p> : null}
                  <div className="classified-bs" role="group" aria-label={`貸借対照表・${taxIncluded ? "税金あり" : "税金なし"}`}>
                    <section className="classified-bs-side asset-side" aria-labelledby={`assets-heading-${headingSuffix}`}>
                      <h4 id={`assets-heading-${headingSuffix}`}><span>資産の部</span></h4>
                      <div className="bs-account-area">
                      {displayedAssets.financial !== 0 ? <div className={`bs-account financial-account grouped-account ${accountDensity(displayedAssets.financial, displayedAssetTotal)}`} style={{ height: areaHeight(displayedAssets.financial, displayedAssetTotal) }}>
                        <div className="bs-account-heading"><span>金融資産</span><strong><BsAmount value={displayedAssets.financial} total={displayedAssetTotal} /></strong></div>
                        <dl className="bs-subtotals">
                          {displayedAssets.deposits !== 0 ? <div><dt>預金</dt><dd><BsAmount value={displayedAssets.deposits} total={displayedAssetTotal} /></dd></div> : null}
                          {displayedAssets.securities !== 0 ? <div><dt>有価証券</dt><dd><BsAmount value={displayedAssets.securities} total={displayedAssetTotal} /></dd></div> : null}
                          {displayedAssets.insurance !== 0 ? <div><dt>生命保険{taxIncluded ? "（死亡保険金）" : ""}</dt><dd><BsAmount value={displayedAssets.insurance} total={displayedAssetTotal} /></dd></div> : null}
                        </dl>
                      </div> : null}
                      {displayedAssets.realEstate !== 0 ? <div className={`bs-account real-estate-account grouped-account ${accountDensity(displayedAssets.realEstate, displayedAssetTotal)}`} style={{ height: areaHeight(displayedAssets.realEstate, displayedAssetTotal) }}>
                        <div className="bs-account-heading"><span>不動産</span><strong><BsAmount value={displayedAssets.realEstate} total={displayedAssetTotal} /></strong></div>
                        <dl className="bs-subtotals">
                          {displayedAssets.homeRealEstate !== 0 ? <div><dt>自宅</dt><dd><BsAmount value={displayedAssets.homeRealEstate} total={displayedAssetTotal} /></dd></div> : null}
                          {displayedAssets.incomeRealEstate !== 0 ? <div><dt>収益不動産</dt><dd><BsAmount value={displayedAssets.incomeRealEstate} total={displayedAssetTotal} /></dd></div> : null}
                          {displayedAssets.idleRealEstate !== 0 ? <div><dt>遊休不動産</dt><dd><BsAmount value={displayedAssets.idleRealEstate} total={displayedAssetTotal} /></dd></div> : null}
                        </dl>
                      </div> : null}
                      {displayedAssets.business !== 0 ? <div className={`bs-account business-account grouped-account ${accountDensity(displayedAssets.business, displayedAssetTotal)}`} style={{ height: areaHeight(displayedAssets.business, displayedAssetTotal) }}>
                        <div className="bs-account-heading"><span>事業用資産</span><strong><BsAmount value={displayedAssets.business} total={displayedAssetTotal} /></strong></div>
                        <dl className="bs-subtotals">
                          {displayedAssets.privateShares !== 0 ? <div><dt>自社株</dt><dd><BsAmount value={displayedAssets.privateShares} total={displayedAssetTotal} /></dd></div> : null}
                          {displayedAssets.businessAssets !== 0 ? <div><dt>事業用資産</dt><dd><BsAmount value={displayedAssets.businessAssets} total={displayedAssetTotal} /></dd></div> : null}
                          {displayedAssets.loanReceivables !== 0 ? <div><dt>貸付金</dt><dd><BsAmount value={displayedAssets.loanReceivables} total={displayedAssetTotal} /></dd></div> : null}
                        </dl>
                      </div> : null}
                      {displayedAssets.otherAssets !== 0 ? <div className={`bs-account other-account ${accountDensity(displayedAssets.otherAssets, displayedAssetTotal)}`} style={{ height: areaHeight(displayedAssets.otherAssets, displayedAssetTotal) }}><div><span>その他資産</span></div><strong><BsAmount value={displayedAssets.otherAssets} total={displayedAssetTotal} /></strong></div> : null}
                      </div>
                      <footer><span>資産合計</span><strong>{compactYen(displayedAssetTotal)}</strong></footer>
                    </section>
                    <section className="classified-bs-side funding-side" aria-labelledby={`funding-heading-${headingSuffix}`}>
                      <h4 id={`funding-heading-${headingSuffix}`}><span>負債・純資産の部</span></h4>
                      <div className="bs-account-area">
                      {displayedTaxes !== 0 ? <div className={`bs-account forecast-account grouped-account ${accountDensity(displayedTaxes, fundingAreaTotal)}`} style={{ height: areaHeight(displayedTaxes, fundingAreaTotal) }}>
                        <div className="bs-account-heading"><span>税金</span><strong><BsAmount value={displayedTaxes} total={displayedAssetTotal} /></strong></div>
                        <dl className="bs-subtotals">
                          {estimatedInheritanceTax !== 0 ? <div><dt>相続税</dt><dd><BsAmount value={estimatedInheritanceTax} total={displayedAssetTotal} /></dd></div> : null}
                          {otherTaxes !== 0 ? <div><dt>その他税金</dt><dd><BsAmount value={otherTaxes} total={displayedAssetTotal} /></dd></div> : null}
                        </dl>
                      </div> : null}
                      {summary.liabilities !== 0 ? <div className={`bs-account medium-liability grouped-account ${accountDensity(summary.liabilities, fundingAreaTotal)}`} style={{ height: areaHeight(summary.liabilities, fundingAreaTotal) }}>
                        <div className="bs-account-heading"><span>借入金</span><strong><BsAmount value={summary.liabilities} total={displayedAssetTotal} /></strong></div>
                        <dl className="bs-subtotals">
                          {loanBreakdown.home !== 0 ? <div><dt>住宅ローン</dt><dd><BsAmount value={loanBreakdown.home} total={displayedAssetTotal} /></dd></div> : null}
                          {loanBreakdown.investmentProperty !== 0 ? <div><dt>不動産投資ローン</dt><dd><BsAmount value={loanBreakdown.investmentProperty} total={displayedAssetTotal} /></dd></div> : null}
                          {loanBreakdown.securities !== 0 ? <div><dt>証券担保ローン</dt><dd><BsAmount value={loanBreakdown.securities} total={displayedAssetTotal} /></dd></div> : null}
                          {loanBreakdown.business !== 0 ? <div><dt>事業用借入</dt><dd><BsAmount value={loanBreakdown.business} total={displayedAssetTotal} /></dd></div> : null}
                          {loanBreakdown.other !== 0 ? <div><dt>その他借入金</dt><dd><BsAmount value={loanBreakdown.other} total={displayedAssetTotal} /></dd></div> : null}
                        </dl>
                      </div> : null}
                      {displayedSuccessionCosts !== 0 ? <div className={`bs-account forecast-account ${accountDensity(displayedSuccessionCosts, fundingAreaTotal)}`} aria-label={`承継関連費用 ${compactYen(displayedSuccessionCosts)}`} style={{ height: areaHeight(displayedSuccessionCosts, fundingAreaTotal) }}><div><span>承継関連費用</span><small className="bs-subcategories">承継時の諸費用</small></div><strong><BsAmount value={displayedSuccessionCosts} total={displayedAssetTotal} /></strong></div> : null}
                      {displayedNetWorth !== 0 ? <div className={`bs-account net-assets ${accountDensity(displayedNetWorth, fundingAreaTotal)}`} style={{ height: areaHeight(displayedNetWorth, fundingAreaTotal) }}>
                        <div><span>純資産</span><small>{taxIncluded ? "資産 − 負債 − 税金等" : "資産 − 負債"}</small></div><strong><BsAmount value={displayedNetWorth} total={displayedAssetTotal} /></strong>
                      </div> : null}
                      </div>
                      <footer><span>負債・純資産合計</span><strong>{compactYen(summary.liabilities + forecastAdjustments + displayedNetWorth)}</strong></footer>
                    </section>
                  </div>
                  {smallAreaItems.length > 0 ? <div className="bs-small-area-key" role="note" aria-label="小さい区画の補助表示">
                    <span className="bs-small-area-key-title">小区画</span>
                    {smallAreaItems.map((item) => <span className="bs-small-area-key-item" key={`${item.side}-${item.label}`}>
                      <small>{item.side}</small><strong>{item.label}</strong><b>{compactYen(item.value)}</b><em>{percent.format(item.value / Math.max(displayedAssetTotal, 1) * 100)}%</em>
                    </span>)}
                  </div> : null}
                  <p className="guarantee-note" role="note">※ 個人保証残高（B/S外）：<strong>{compactYen(summary.guarantees)}</strong></p>
                </article>;
                })}
              </section>
            </div>
          ) : null}

          {(section === "positions" || printSections?.has("details")) && workingSnapshot ? <div className={`report-document ${section !== "positions" ? "print-only-document" : ""} ${printSections && !printSections.has("details") ? "print-excluded-document" : ""}`}><AssetsView snapshot={workingSnapshot} snapshots={portfolio.snapshots} onSelectSnapshot={(snapshotId) => router.replace(sectionHref("positions", snapshotId))} onCreateNext={() => setYearCreationSourceId(workingSnapshot.id)} onAdd={openNewPosition} onBulkAdd={() => setBulkModalMode("add")} onBulkEdit={() => setBulkModalMode("edit")} onEdit={openEditPosition} onDelete={setDeletingPosition} onReorder={(side, orderedIds) => reorderPositions(workingSnapshot.id, side, orderedIds)} onEditTaxes={() => setSnapshotTaxModalOpen(true)} onBack={workingSnapshot.isCurrent ? undefined : () => router.push(sectionHref("history"))} saving={saving} /></div> : null}
          {(section === "history" || printSections?.has("history")) ? <div className={`report-document ${section !== "history" ? "print-only-document" : ""} ${printSections && !printSections.has("history") ? "print-excluded-document" : ""}`}><HistoryView key={portfolio.snapshots.map((snapshot) => snapshot.id).join("-")} snapshots={portfolio.snapshots} onCreate={() => setYearCreationSourceId(current.id)} onEditSnapshot={editSnapshot} onDeleteSnapshot={setDeletingSnapshot} saving={saving} /></div> : null}
          {section === "backup" ? <div className="report-document print-excluded-document"><BackupView scope="household" household={portfolio.household} /></div> : null}
        </main>
      </div>
      {menuOpen ? <button className="backdrop" aria-label="メニューを閉じる" onClick={() => setMenuOpen(false)} /> : null}
      {modalOpen ? <PositionModal position={editingPosition} onClose={closePositionModal} onSubmit={savePosition} saving={saving} /> : null}
      {bulkModalMode && workingSnapshot ? <BulkPositionModal mode={bulkModalMode} snapshot={workingSnapshot} onClose={() => setBulkModalMode(null)} onSubmit={(positions) => saveBulkPositions(positions, bulkModalMode)} saving={saving} /> : null}
      {deletingPosition ? <DeletePositionModal position={deletingPosition} onClose={() => setDeletingPosition(null)} onDelete={() => void deletePosition()} saving={saving} /> : null}
      {deletingSnapshot ? <DeleteSnapshotModal snapshot={deletingSnapshot} snapshotCount={portfolio.snapshots.length} onClose={() => setDeletingSnapshot(null)} onSubmit={deleteSnapshot} saving={saving} /> : null}
      {forecastModalOpen ? <ForecastModal planning={portfolio.planning} onClose={() => setForecastModalOpen(false)} onSubmit={saveForecast} saving={saving} /> : null}
      {yearCreationSourceId !== null ? <YearCreationModal snapshots={portfolio.snapshots} initialSourceId={yearCreationSourceId} onClose={() => setYearCreationSourceId(null)} onSubmit={saveSnapshot} onEditExisting={(snapshotId) => { setYearCreationSourceId(null); editSnapshot(snapshotId); }} saving={saving} /> : null}
      {snapshotTaxModalOpen && workingSnapshot ? <SnapshotTaxModal snapshot={workingSnapshot} onClose={() => setSnapshotTaxModalOpen(false)} onSubmit={saveSnapshotTaxes} saving={saving} /> : null}
      {clientEditOpen ? <ClientEditModal household={portfolio.household} error={error} saving={saving} onClose={() => setClientEditOpen(false)} onSubmit={saveClient} onRequestDelete={() => { setError(""); setClientEditOpen(false); setClientDeleteOpen(true); }} /> : null}
      {clientDeleteOpen ? <ClientDeleteModal household={portfolio.household} snapshotCount={portfolio.snapshots.length} positionCount={portfolio.snapshots.reduce((count, snapshot) => count + snapshot.positions.length, 0)} error={error} saving={saving} onClose={() => setClientDeleteOpen(false)} onSubmit={deleteClient} /> : null}
      {printGuideOpen ? <PrintGuideModal section={section} onClose={() => setPrintGuideOpen(false)} onPrint={(sections) => {
        setPrintSections(new Set(sections));
        const cleanup = () => { setPrintSections(null); };
        window.addEventListener("afterprint", cleanup, { once: true });
        setPrintGuideOpen(false);
        window.setTimeout(() => window.print(), 100);
      }} /> : null}
    </div>
  );
}
