"use client";

import {
  AlertTriangle, Calculator, ChevronLeft, ChevronRight, CircleUserRound, Clock3, DatabaseBackup, History, LayoutDashboard, Link2,
  LoaderCircle, Menu, PanelLeftClose, PanelLeftOpen, Pencil, Printer, ShieldCheck, UsersRound, WalletCards, X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { BackupView } from "@/components/backup-view";
import { BalanceScenarioActions, BalanceSheetPanel } from "@/components/balance-sheet-panel";
import { BulkPositionModal } from "@/components/bulk-position-modal";
import {
  ClientDeleteModal, DeleteSnapshotModal, ForecastModal, PrintGuideModal, SnapshotSettingsModal, YearCreationModal,
} from "@/components/dashboard-modals";
import { HistoryView } from "@/components/history-view";
import { FamilyView } from "@/components/family-view";
import { InheritanceTaxReport } from "@/components/inheritance-tax-report";
import { PersonView } from "@/components/person-view";
import { PortalLink } from "@/components/portal-link";
import { DeletePositionModal, PositionModal } from "@/components/position-modal";
import { AssetsView } from "@/components/positions-view";
import { PRINT_SECTION_META, PrintFrontMatter } from "@/components/print-front-matter";
import { PersonFamilyPrintView } from "@/components/print-person-family";
import { SecondaryInheritanceSimulator } from "@/components/secondary-inheritance-simulator";
import { usePortfolio } from "@/components/use-portfolio";
import { buildBalanceView, loanBreakdownTotals, successionAssetTotals } from "@/lib/balance-view";
import { legalHeirNames, type FamilyMemberDraft } from "@/lib/family";
import { dateJa, unformatNumberInput } from "@/lib/format";
import {
  type BalanceScenario,
  type BulkPositionPayload,
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
  { key: "profile", label: "本人情報", icon: CircleUserRound },
  { key: "family", label: "親族関係", icon: UsersRound },
  { key: "balance", label: "貸借対照表", icon: LayoutDashboard },
  { key: "positions", label: "資産・負債明細", icon: WalletCards },
  { key: "tax", label: "相続税の概算", icon: Calculator },
  { key: "history", label: "年度比較", icon: History },
  { key: "backup", label: "バックアップ", icon: DatabaseBackup },
] as const satisfies ReadonlyArray<{ key: Section; label: string; icon: typeof LayoutDashboard }>;

export function Dashboard({ householdId, section }: { householdId: number; section: Section }) {
  const { portfolio, saving, error, setError, load, mutate, router } = usePortfolio(householdId);
  const [balanceScenario, setBalanceScenario] = useState<BalanceScenario>("without-tax");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  // 表ごとの「追加」から開いたときは、その表の区分を選んだ状態でモーダルを開く。
  const [newPositionSection, setNewPositionSection] = useState<PositionSection>("ASSET");
  const [deletingPosition, setDeletingPosition] = useState<Position | null>(null);
  const [deletingSnapshot, setDeletingSnapshot] = useState<Snapshot | null>(null);
  const [forecastModalOpen, setForecastModalOpen] = useState(false);
  const searchParams = useSearchParams();
  // 明細で開いている年度は URL のクエリで持ち、画面を移動しても選択が残るようにする。
  const workingSnapshotId = Number(searchParams.get("snapshot")) || null;
  const [yearCreationSourceId, setYearCreationSourceId] = useState<number | null>(null);
  const [snapshotSettingsModalOpen, setSnapshotSettingsModalOpen] = useState(false);
  const [printGuideOpen, setPrintGuideOpen] = useState(false);
  const [printSections, setPrintSections] = useState<Set<PrintSection> | null>(null);
  const [clientDeleteOpen, setClientDeleteOpen] = useState(false);
  const [clientSaved, setClientSaved] = useState(false);
  const [taxApiStatus, setTaxApiStatus] = useState<"idle" | "loading" | "success">("idle");

  const current = portfolio?.snapshots.find((snapshot) => snapshot.isCurrent);
  const workingSnapshot = portfolio?.snapshots.find((snapshot) => snapshot.id === workingSnapshotId) ?? current;
  const summary = useMemo(() => totals(workingSnapshot?.positions ?? []), [workingSnapshot]);
  const successionAssets = useMemo(() => successionAssetTotals(workingSnapshot?.positions ?? []), [workingSnapshot]);
  // 非課税枠の判定に使う法定相続人の氏名。受取人を選ぶだけで判定できるよう、入力欄では持たせない。
  const legalHeirNameSet = useMemo(() => legalHeirNames(portfolio?.familyMembers ?? []), [portfolio]);
  // 保険の被保険者・受取人の選択肢。本人と親族関係タブの登録者を氏名で並べる。
  const familyPeopleNames = useMemo(
    () => [...new Set([portfolio?.household.name, ...(portfolio?.familyMembers ?? []).map((member) => member.name)].filter((name): name is string => Boolean(name?.trim())))],
    [portfolio],
  );
  const loanBreakdown = useMemo(() => loanBreakdownTotals(workingSnapshot?.positions ?? []), [workingSnapshot]);
  // 税金は年度ごとに保存している（承継関連費用だけは顧客単位）。
  const estimatedInheritanceTax = workingSnapshot?.estimatedInheritanceTax ?? 0;
  const otherTaxes = workingSnapshot?.otherTaxes ?? 0;
  const successionCosts = portfolio?.planning.successionCosts ?? 0;
  const balanceView = (scenario: BalanceScenario) => buildBalanceView({
    scenario, summary, successionAssets, loanBreakdown, estimatedInheritanceTax, otherTaxes, successionCosts,
  });

  function openNewPosition(section: PositionSection = "ASSET") {
    setEditingPosition(null);
    setNewPositionSection(section);
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
    setClientSaved(false);
    const body = { ...Object.fromEntries(new FormData(event.currentTarget).entries()), id: householdId };
    const { ok } = await mutate("/clients", "PATCH", body, "顧客情報を保存できませんでした。");
    if (!ok) return;
    await load();
    setClientSaved(true);
  }

  async function deleteClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = { id: householdId, confirmationClientCode: new FormData(event.currentTarget).get("confirmationClientCode") };
    const { ok } = await mutate("/clients", "DELETE", body, "顧客を削除できませんでした。");
    // 削除した顧客のURLに留まらないよう、一覧へ戻す。
    if (ok) router.replace("/");
  }

  async function savePosition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fields = Object.fromEntries(form.entries()) as Record<string, unknown>;
    for (const fieldName of ["originalAmount", "valuationQuantity", "valuationUnitPrice", "adjustmentRate", "landArea", "roadsideValue", "fixedAssetTaxValue", "valuationMultiplier", "ownershipNumerator", "ownershipDenominator"]) {
      if (fieldName in fields) fields[fieldName] = unformatNumberInput(fields[fieldName] as FormDataEntryValue | undefined) ?? "";
    }
    const numericDetailFields = new Set(["deathBenefit", "retirementAllowance", "totalIssuedShares", "floorArea"]);
    const assetDetails: Record<string, unknown> = {};
    // 死亡保険金・死亡退職金の受取人は複数行あるので、`benefitAllocation.<行番号>.<項目>` を配列へ組み立てる。
    const allocationRows = new Map<number, Record<string, string | number>>();
    for (const [fieldName, rawValue] of Object.entries(fields)) {
      if (!fieldName.startsWith("assetDetail.")) continue;
      const detailName = fieldName.slice("assetDetail.".length);
      const value = String(rawValue).trim();
      const allocationField = /^benefitAllocation\.(\d+)\.(recipient|numerator|denominator)$/.exec(detailName);
      if (allocationField) {
        const index = Number(allocationField[1]);
        const row = allocationRows.get(index) ?? {};
        row[allocationField[2]] = allocationField[2] === "recipient" ? value : Number(value);
        allocationRows.set(index, row);
      }
      else if (value !== "") {
        assetDetails[detailName] = numericDetailFields.has(detailName) ? Number(value.replace(/,/g, "")) : value;
      }
      delete fields[fieldName];
    }
    if (allocationRows.size > 0) {
      assetDetails.benefitAllocations = [...allocationRows.entries()].sort(([a], [b]) => a - b).map(([, row]) => row);
    }
    fields.assetDetails = assetDetails;
    // 円換算レート未登録など、サーバ側で理由が分かる場合はその文言をそのまま出す。
    const fallback = editingPosition ? "修正できませんでした。入力内容を確認してください。" : "登録できませんでした。入力内容を確認してください。";
    const { ok } = await mutate(
      editingPosition ? `/positions/${editingPosition.id}` : "/positions",
      editingPosition ? "PUT" : "POST",
      { ...fields, snapshotId: workingSnapshot?.id },
      fallback,
    );
    if (!ok) return;
    closePositionModal();
    await load();
  }

  async function saveBulkPositions(positions: BulkPositionPayload[]) {
    if (!workingSnapshot) return false;
    const { ok } = await mutate("/positions/bulk", "PATCH", { snapshotId: workingSnapshot.id, positions }, "明細を一括保存できませんでした。入力内容を確認してください。");
    if (!ok) return false;
    setBulkModalOpen(false);
    await load();
    return true;
  }

  async function deletePosition() {
    if (!deletingPosition) return;
    const { ok } = await mutate(`/positions/${deletingPosition.id}`, "DELETE", undefined, "削除できませんでした。");
    if (!ok) return;
    setDeletingPosition(null);
    await load();
  }

  async function reorderPositions(snapshotId: number, section: PositionSection, orderedIds: number[]) {
    const { ok } = await mutate("/positions/reorder", "PUT", { snapshotId, section, orderedIds }, "並び順を保存できませんでした。");
    if (!ok) return false;
    await load();
    return true;
  }

  async function deleteSnapshot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!deletingSnapshot) return;
    const confirmationFiscalYear = new FormData(event.currentTarget).get("confirmationFiscalYear");
    const { ok } = await mutate(`/snapshots/${deletingSnapshot.id}`, "DELETE", { confirmationFiscalYear }, "年度データを削除できませんでした。");
    if (!ok) return;
    setDeletingSnapshot(null);
    // 削除した年度を URL に残さない。
    if (workingSnapshotId === deletingSnapshot.id) router.replace(`/customers/${householdId}/${section}`);
    await load();
  }

  async function saveSnapshot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    // 同じ年度が既にある場合（409）は失敗ではなく分岐として扱い、その年度を開いて知らせる。
    const { ok, status, result } = await mutate("/snapshots", "POST", body, "年度を作成できませんでした。", { silentStatus: 409 });
    if (status === 409 && typeof result?.existingSnapshotId === "number") {
      setYearCreationSourceId(null);
      editSnapshot(result.existingSnapshotId);
      setError(`${result.error} 既存年度を表示しました。`);
      return;
    }
    if (!ok) return;
    setYearCreationSourceId(null);
    await load();
  }

  async function saveSnapshotSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workingSnapshot) return;
    // 円換算レートは `fxRate.USD` のような名前で並ぶので、通貨→レートの表にまとめ直して送る。
    const fields = Object.fromEntries(new FormData(event.currentTarget).entries()) as Record<string, unknown>;
    const fxRates: Record<string, number> = {};
    for (const [fieldName, rawValue] of Object.entries(fields)) {
      if (!fieldName.startsWith("fxRate.")) continue;
      const value = unformatNumberInput(rawValue as FormDataEntryValue);
      if (value) fxRates[fieldName.slice("fxRate.".length)] = Number(value);
      delete fields[fieldName];
    }
    fields.fxRates = fxRates;
    const { ok } = await mutate(`/snapshots/${workingSnapshot.id}`, "PUT", fields, "年度設定を保存できませんでした。");
    if (!ok) return;
    setSnapshotSettingsModalOpen(false);
    await load();
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
    const body = { ...Object.fromEntries(new FormData(event.currentTarget).entries()), householdId: portfolio.household.id };
    const { ok } = await mutate("/inheritance-estimate", "PUT", body, "税金・費用を保存できませんでした。");
    if (!ok) return;
    setForecastModalOpen(false);
    await load();
  }

  async function saveFamilyMembers(members: FamilyMemberDraft[]) {
    if (!portfolio) return;
    const fallback = "家族情報を保存できませんでした。";
    const { ok, result } = await mutate("/family-members", "PUT", { householdId: portfolio.household.id, members }, fallback);
    // 保存できたかは FamilyView 側でも見ているので、失敗は例外として返す。
    if (!ok) throw new Error(result?.error ?? fallback);
    await load();
  }

  async function calculateInheritanceTaxViaApi() {
    if (!portfolio || taxApiStatus === "loading") return;
    setTaxApiStatus("loading");
    const { ok } = await mutate("/inheritance-tax-calculate", "POST", { householdId: portfolio.household.id }, "相続税を計算できませんでした。");
    if (!ok) { setTaxApiStatus("idle"); return; }
    await load();
    setBalanceScenario("with-tax");
    setTaxApiStatus("success");
    window.setTimeout(() => setTaxApiStatus("idle"), 3_000);
  }

  if (!portfolio || !current) {
    return <main className="initial-loader"><PortalLink /><LoaderCircle className="spin" /><p>{error || "貸借対照表を読み込んでいます"}</p>{error ? <button className="button secondary" onClick={() => void load()}>再読み込み</button> : null}</main>;
  }
  // 表示中の年度。?snapshot= が無効なときは現在年度にフォールバックする。
  const reportSnapshot = workingSnapshot ?? current;
  const currentPrintSection: PrintSection | null =
    section === "profile" || section === "family" ? "profile-family"
        : section === "balance" ? "balance"
          : section === "positions" ? "details"
            : section === "tax" ? "tax-calculation"
              : section === "history" ? "history"
                : null;
  const includedPrintSections = printSections
    ? PRINT_SECTION_META.map(({ key }) => key).filter((key) => printSections.has(key))
    : currentPrintSection ? [currentPrintSection] : [];

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
        <PrintFrontMatter household={portfolio.household} snapshot={reportSnapshot} sections={includedPrintSections} />
        <header className="topbar">
          <button className="menu-button" aria-label="メニューを開く" onClick={() => setMenuOpen(true)}><Menu /></button>
          <div className="topbar-subject">
            <Link className="back-to-list" href="/"><ChevronLeft />一覧に戻る</Link>
            <button type="button" className="client-switcher-trigger" onClick={() => router.push(sectionHref("profile", null))} aria-label={`本人情報を開く。現在は${portfolio.household.name}`}><span><strong>{portfolio.household.name}</strong><em>{portfolio.household.clientCode}{portfolio.household.assignedStaff ? `・担当 ${portfolio.household.assignedStaff}` : ""}</em></span><Pencil /></button>
          </div>
          <div className="top-actions"><button type="button" className="as-of as-of-button" onClick={() => setSnapshotSettingsModalOpen(true)} aria-label={`${reportSnapshot.isCurrent ? "現在" : fiscalYearLabel(reportSnapshot)}のB/S基準日 ${dateJa(reportSnapshot.asOfDate)}。年度設定を開く`} aria-haspopup="dialog"><Clock3 /><small>{reportSnapshot.isCurrent ? "現在B/S基準日" : `${fiscalYearLabel(reportSnapshot)}基準日`}</small><strong>{dateJa(reportSnapshot.asOfDate)}</strong><Pencil className="as-of-edit-icon" aria-hidden="true" /></button><button className="button secondary" onClick={() => setPrintGuideOpen(true)}><Printer />印刷・PDF出力</button></div>
        </header>

        <main id="main-content" className="content">
          {error ? <div className="error-banner" role="alert"><AlertTriangle />{error}<button onClick={() => setError("")} aria-label="閉じる"><X /></button></div> : null}
          {printSections?.has("profile-family") ? <div id="print-section-profile-family" className="report-document print-only-document"><PersonFamilyPrintView household={portfolio.household} members={portfolio.familyMembers} referenceDate={reportSnapshot.asOfDate} /></div> : null}
          {(section === "balance" || printSections?.has("balance")) ? (
            <div id="print-section-balance" className={`report-document ${section !== "balance" ? "print-only-document" : ""} ${printSections && !printSections.has("balance") ? "print-excluded-document" : ""}`}>
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
                  const view = balanceView(reportScenario);
                  return <BalanceSheetPanel
                    key={reportScenario}
                    view={view}
                    headingSuffix={reportScenario}
                    subtitle={`${reportSnapshot.isCurrent ? "" : `${fiscalYearLabel(reportSnapshot)}・`}${view.taxIncluded ? "相続時予測（死亡保険金・税金を反映）" : "現在価値（保険は解約返戻金）"}`}
                    ownerName={reportScenario === "with-tax" ? portfolio.household.name : null}
                    liabilities={summary.liabilities}
                    guarantees={summary.guarantees}
                    deemedBenefitMissingCount={successionAssets.deemedBenefitMissingCount}
                    action={reportScenario === balanceScenario ? <BalanceScenarioActions
                      taxIncluded={view.taxIncluded}
                      isCurrent={reportSnapshot.isCurrent}
                      taxApiStatus={taxApiStatus}
                      onSelectScenario={setBalanceScenario}
                      onCalculateTax={() => void calculateInheritanceTaxViaApi()}
                      onOpenForecast={() => setForecastModalOpen(true)}
                    /> : undefined}
                  />;
                })}
              </section>
            </div>
          ) : null}
          {(section === "tax" || printSections?.has("tax-calculation")) ? <div
            id="print-section-tax-calculation"
            className={`report-document tax-calculation-document ${section !== "tax" ? "print-only-document" : ""} ${printSections && !printSections.has("tax-calculation") ? "print-excluded-document" : ""}`}
          >
            {section === "tax" && reportSnapshot.isCurrent ? <div className="tax-section-toolbar">
              <button className="button secondary tax-api-button" type="button" onClick={() => void calculateInheritanceTaxViaApi()} disabled={taxApiStatus === "loading"} aria-live="polite">{taxApiStatus === "loading" ? <LoaderCircle className="spin" /> : <Calculator />}{taxApiStatus === "success" ? "連携しました" : taxApiStatus === "loading" ? "計算中" : reportSnapshot.inheritanceTaxCalculation ? "APIで再計算" : "APIで相続税を計算"}</button>
            </div> : null}
            {reportSnapshot.inheritanceTaxCalculation
              ? <>
                <InheritanceTaxReport household={portfolio.household} snapshot={reportSnapshot} planning={portfolio.planning} familyMembers={portfolio.familyMembers} calculation={reportSnapshot.inheritanceTaxCalculation} onRecalculate={section === "tax" && reportSnapshot.isCurrent ? () => void calculateInheritanceTaxViaApi() : undefined} recalculating={taxApiStatus === "loading"} />
                {section === "tax" && portfolio.planning.hasSpouse && portfolio.planning.heirRank === "rank1" ? <SecondaryInheritanceSimulator householdId={portfolio.household.id} /> : null}
              </>
              : section === "tax" ? <div className="tax-empty-state" role="note"><Calculator /><p>まだ相続税の概算を計算していません。</p><p>{reportSnapshot.isCurrent ? "上のボタンから、現在のB/Sと親族関係をもとに概算税額を計算できます。" : "概算は現在年度のB/Sで計算してください。"}</p></div>
              : null}
          </div> : null}

          {(section === "positions" || printSections?.has("details")) && workingSnapshot ? <div id="print-section-details" className={`report-document ${section !== "positions" ? "print-only-document" : ""} ${printSections && !printSections.has("details") ? "print-excluded-document" : ""}`}><AssetsView snapshot={workingSnapshot} snapshots={portfolio.snapshots} legalHeirNames={legalHeirNameSet} onSelectSnapshot={(snapshotId) => router.replace(sectionHref("positions", snapshotId))} onCreateNext={() => setYearCreationSourceId(workingSnapshot.id)} onAdd={openNewPosition} onBulkManage={() => setBulkModalOpen(true)} onEdit={openEditPosition} onDelete={setDeletingPosition} onReorder={(side, orderedIds) => reorderPositions(workingSnapshot.id, side, orderedIds)} onEditSettings={() => setSnapshotSettingsModalOpen(true)} onBack={workingSnapshot.isCurrent ? undefined : () => router.push(sectionHref("history"))} saving={saving} /></div> : null}
          {section === "profile" ? <div className="report-document print-excluded-document"><PersonView household={portfolio.household} referenceDate={reportSnapshot.asOfDate} saving={saving} saved={clientSaved} onSubmit={saveClient} onRequestDelete={() => { setError(""); setClientDeleteOpen(true); }} /></div> : null}
          {section === "family" ? <div className="report-document print-excluded-document"><FamilyView members={portfolio.familyMembers} referenceDate={reportSnapshot.asOfDate} saving={saving} onSave={saveFamilyMembers} /></div> : null}
          {(section === "history" || printSections?.has("history")) ? <div id="print-section-history" className={`report-document ${section !== "history" ? "print-only-document" : ""} ${printSections && !printSections.has("history") ? "print-excluded-document" : ""}`}><HistoryView key={portfolio.snapshots.map((snapshot) => snapshot.id).join("-")} snapshots={portfolio.snapshots} onCreate={() => setYearCreationSourceId(current.id)} onEditSnapshot={editSnapshot} onDeleteSnapshot={setDeletingSnapshot} saving={saving} /></div> : null}
          {section === "backup" ? <div className="report-document print-excluded-document"><BackupView scope="household" portfolio={portfolio} /></div> : null}
        </main>
      </div>
      {menuOpen ? <button className="backdrop" aria-label="メニューを閉じる" onClick={() => setMenuOpen(false)} /> : null}
      {modalOpen ? <PositionModal position={editingPosition} defaultSection={newPositionSection} people={familyPeopleNames} legalHeirNames={legalHeirNameSet} fxRates={workingSnapshot?.fxRates ?? {}} onClose={closePositionModal} onSubmit={savePosition} saving={saving} /> : null}
      {bulkModalOpen && workingSnapshot ? <BulkPositionModal snapshot={workingSnapshot} onClose={() => setBulkModalOpen(false)} onSubmit={saveBulkPositions} saving={saving} /> : null}
      {deletingPosition ? <DeletePositionModal position={deletingPosition} onClose={() => setDeletingPosition(null)} onDelete={() => void deletePosition()} saving={saving} /> : null}
      {deletingSnapshot ? <DeleteSnapshotModal snapshot={deletingSnapshot} snapshotCount={portfolio.snapshots.length} onClose={() => setDeletingSnapshot(null)} onSubmit={deleteSnapshot} saving={saving} /> : null}
      {forecastModalOpen ? <ForecastModal planning={portfolio.planning} onClose={() => setForecastModalOpen(false)} onSubmit={saveForecast} saving={saving} /> : null}
      {yearCreationSourceId !== null ? <YearCreationModal snapshots={portfolio.snapshots} initialSourceId={yearCreationSourceId} onClose={() => setYearCreationSourceId(null)} onSubmit={saveSnapshot} onEditExisting={(snapshotId) => { setYearCreationSourceId(null); editSnapshot(snapshotId); }} saving={saving} /> : null}
      {snapshotSettingsModalOpen && workingSnapshot ? <SnapshotSettingsModal snapshot={workingSnapshot} onClose={() => setSnapshotSettingsModalOpen(false)} onSubmit={saveSnapshotSettings} saving={saving} /> : null}
      {clientDeleteOpen ? <ClientDeleteModal household={portfolio.household} snapshotCount={portfolio.snapshots.length} positionCount={portfolio.snapshots.reduce((count, snapshot) => count + snapshot.positions.length, 0)} error={error} saving={saving} onClose={() => setClientDeleteOpen(false)} onSubmit={deleteClient} /> : null}
      {printGuideOpen ? <PrintGuideModal section={section} taxCalculationAvailable={reportSnapshot.inheritanceTaxCalculation !== null} onClose={() => setPrintGuideOpen(false)} onPrint={(sections) => {
        setPrintSections(new Set(sections));
        const cleanup = () => { setPrintSections(null); };
        window.addEventListener("afterprint", cleanup, { once: true });
        setPrintGuideOpen(false);
        window.setTimeout(() => window.print(), 100);
      }} /> : null}
    </div>
  );
}
