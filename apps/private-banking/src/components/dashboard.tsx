"use client";

import {
  AlertTriangle, Calculator, ChevronLeft, ChevronRight, CircleUserRound, Clock3, DatabaseBackup, History, LayoutDashboard, Link2,
  LoaderCircle, Menu, PanelLeftClose, PanelLeftOpen, Pencil, Printer, ShieldCheck, UsersRound, WalletCards, X,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BackupView } from "@/components/backup-view";
import { BulkPositionModal } from "@/components/bulk-position-modal";
import {
  ClientDeleteModal, DeleteSnapshotModal, ForecastModal, PrintGuideModal, SnapshotSettingsModal, YearCreationModal,
} from "@/components/dashboard-modals";
import { HistoryView } from "@/components/history-view";
import { FamilyView } from "@/components/family-view";
import { InheritanceTaxReport } from "@/components/inheritance-tax-report";
import { PanelHeader } from "@/components/panel-header";
import { PersonView } from "@/components/person-view";
import { PortalLink } from "@/components/portal-link";
import { DeletePositionModal, PositionModal } from "@/components/position-modal";
import { AssetsView } from "@/components/positions-view";
import { PersonFamilyPrintView } from "@/components/print-person-family";
import { SecondaryInheritanceSimulator } from "@/components/secondary-inheritance-simulator";
import { API_BASE } from "@/lib/api";
import { ClientSummary } from "@/lib/clients";
import type { FamilyMemberDraft } from "@/lib/family";
import { compactYen, dateJa, percent, unformatNumberInput } from "@/lib/format";
import {
  type BalanceScenario,
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
  { key: "tax", label: "相続税の概算", icon: Calculator },
  { key: "profile", label: "本人情報", icon: CircleUserRound },
  { key: "family", label: "親族関係", icon: UsersRound },
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

function BsSubtotals({ items, total }: { items: ReadonlyArray<{ label: string; value: number }>; total: number }) {
  return <dl className="bs-subtotals">{items.map((item) => <div key={item.label}><dt>{item.label}</dt><dd><BsAmount value={item.value} total={total} /></dd></div>)}</dl>;
}

const PRINT_SECTION_META: ReadonlyArray<{ key: PrintSection; title: string; description: string }> = [
  { key: "profile-family", title: "本人・家族情報", description: "本人の基本情報と親族構成、法定相続分および年齢" },
  { key: "balance", title: "貸借対照表", description: "現在価値と相続時予測による資産・負債の構成" },
  { key: "tax-calculation", title: "相続税の概算", description: "概算税額および計算根拠" },
  { key: "details", title: "資産・負債明細", description: "資産、負債および保証債務の明細" },
  { key: "history", title: "年度比較", description: "年度ごとの残高推移と比較" },
];

function PrintFrontMatter({
  household,
  snapshot,
  sections,
}: {
  household: Portfolio["household"];
  snapshot: Snapshot;
  sections: PrintSection[];
}) {
  const includedSections = PRINT_SECTION_META.filter(({ key }) => sections.includes(key));

  return (
    <div className="print-front-matter" aria-hidden="true">
      <section className="print-cover">
        <div className="print-cover-mark">PERSONAL ASSET BALANCE SHEET</div>
        <div className="print-cover-main">
          <p>PRIVATE BANKING REPORT</p>
          <h1>個人資産・負債管理レポート</h1>
          <span className="print-cover-rule" />
          <dl>
            <div><dt>顧客名</dt><dd>{household.name}</dd></div>
            <div><dt>顧客コード</dt><dd>{household.clientCode}</dd></div>
            <div><dt>対象年度</dt><dd>{fiscalYearLabel(snapshot)}</dd></div>
            <div><dt>B/S基準日</dt><dd>{dateJa(snapshot.asOfDate)}</dd></div>
          </dl>
        </div>
        <p className="print-cover-confidential">CONFIDENTIAL</p>
      </section>

      <section className="print-toc">
        <header>
          <p>CONTENTS</p>
          <h2>目次</h2>
        </header>
        <ol>
          {includedSections.map(({ key, title, description }, index) => (
            <li key={key}>
              <span className="print-toc-index">{String(index + 1).padStart(2, "0")}</span>
              <span className="print-toc-copy"><strong>{title}</strong><small>{description}</small></span>
            </li>
          ))}
        </ol>
        <footer>
          <span>{household.name}</span>
          <span>{fiscalYearLabel(snapshot)}・基準日 {dateJa(snapshot.asOfDate)}</span>
        </footer>
      </section>
    </div>
  );
}

export function Dashboard({ householdId, section }: { householdId: number; section: Section }) {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [balanceScenario, setBalanceScenario] = useState<BalanceScenario>("without-tax");
  const [menuOpen, setMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
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
  const [saving, setSaving] = useState(false);
  const [taxApiStatus, setTaxApiStatus] = useState<"idle" | "loading" | "success">("idle");
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
  // 保険の被保険者・受取人の選択肢。本人と親族関係タブの登録者を氏名で並べる。
  const familyPeopleNames = useMemo(
    () => [...new Set([portfolio?.household.name, ...(portfolio?.familyMembers ?? []).map((member) => member.name)].filter((name): name is string => Boolean(name?.trim())))],
    [portfolio],
  );
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
    // 小分類は枠内描画と枠外注記の両方から使うので、JSX に直書きせずデータで持つ。
    const nonZero = (items: { label: string; value: number }[]) => items.filter((item) => item.value !== 0);
    const subtotals = {
      financial: nonZero([
        { label: "預金", value: displayedAssets.deposits },
        { label: "有価証券", value: displayedAssets.securities },
        { label: `生命保険${taxIncluded ? "（死亡保険金）" : ""}`, value: displayedAssets.insurance },
      ]),
      realEstate: nonZero([
        { label: "自宅", value: displayedAssets.homeRealEstate },
        { label: "収益不動産", value: displayedAssets.incomeRealEstate },
        { label: "遊休不動産", value: displayedAssets.idleRealEstate },
      ]),
      business: nonZero([
        { label: "自社株", value: displayedAssets.privateShares },
        { label: "事業用資産", value: displayedAssets.businessAssets },
        { label: "貸付金", value: displayedAssets.loanReceivables },
      ]),
      taxes: nonZero([
        { label: "相続税", value: estimatedInheritanceTax },
        { label: "その他税金", value: otherTaxes },
      ]),
      loans: nonZero([
        { label: "住宅ローン", value: loanBreakdown.home },
        { label: "不動産投資ローン", value: loanBreakdown.investmentProperty },
        { label: "証券担保ローン", value: loanBreakdown.securities },
        { label: "事業用借入", value: loanBreakdown.business },
        { label: "その他借入金", value: loanBreakdown.other },
      ]),
    };
    // 区画の高さは金額比そのままなので、比率が小さい中分類では小分類が枠外にはみ出して切れる。
    // 印刷時の区画エリアは約420px、1区画に必要な高さは 見出し18px ＋ 小分類1行11px。
    // 収まらない中分類だけ、小分類を枠外注記へ回す。
    const clippedSubtotals = [
      { side: "資産", label: "金融資産", value: displayedAssets.financial, areaTotal: displayedAssetTotal, items: subtotals.financial },
      { side: "資産", label: "不動産", value: displayedAssets.realEstate, areaTotal: displayedAssetTotal, items: subtotals.realEstate },
      { side: "資産", label: "事業用資産", value: displayedAssets.business, areaTotal: displayedAssetTotal, items: subtotals.business },
      { side: "負債・純資産", label: "税金", value: displayedTaxes, areaTotal: fundingAreaTotal, items: subtotals.taxes },
      { side: "負債・純資産", label: "借入金", value: summary.liabilities, areaTotal: fundingAreaTotal, items: subtotals.loans },
    ].filter((account) => account.value !== 0 && account.items.length > 0
      && Math.abs(account.value) / Math.max(account.areaTotal, 1) * 420 < 18 + account.items.length * 11);
    return { taxIncluded, displayedAssets, displayedAssetTotal, displayedTaxes, displayedSuccessionCosts, forecastAdjustments, displayedNetWorth, fundingAreaTotal, smallAreaItems, subtotals, clippedSubtotals };
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
    setClientSaved(false);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/clients`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(new FormData(event.currentTarget).entries()), id: householdId }),
      });
      const result = await response.json().catch(() => null) as (ClientSummary & { error?: string }) | null;
      if (!response.ok || !result) throw new Error(result?.error ?? "顧客情報を保存できませんでした。");
      await load();
      setClientSaved(true);
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
    for (const fieldName of ["originalAmount", "valuationQuantity", "valuationUnitPrice", "adjustmentRate", "landArea", "roadsideValue", "fixedAssetTaxValue", "valuationMultiplier", "ownershipNumerator", "ownershipDenominator"]) {
      if (fieldName in fields) fields[fieldName] = unformatNumberInput(fields[fieldName] as FormDataEntryValue | undefined) ?? "";
    }
    const numericDetailFields = new Set(["deathBenefit", "totalIssuedShares", "floorArea"]);
    const assetDetails: Record<string, string | number | boolean> = {};
    for (const [fieldName, rawValue] of Object.entries(fields)) {
      if (!fieldName.startsWith("assetDetail.")) continue;
      const detailName = fieldName.slice("assetDetail.".length);
      const value = String(rawValue).trim();
      if (value !== "") {
        assetDetails[detailName] = detailName === "beneficiaryIsLegalHeir"
          ? value === "true"
          : numericDetailFields.has(detailName)
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
      const result = await response.json().catch(() => null) as { error?: string } | null;
      // 円換算レート未登録など、サーバ側で理由が分かる場合はその文言をそのまま出す。
      if (!response.ok) throw new Error(result?.error);
      closePositionModal();
      await load();
    } catch (positionError) {
      const fallback = editingPosition ? "修正できませんでした。入力内容を確認してください。" : "登録できませんでした。入力内容を確認してください。";
      setError(positionError instanceof Error && positionError.message ? positionError.message : fallback);
    }
    finally { setSaving(false); }
  }

  async function saveBulkPositions(positions: BulkPositionPayload[]) {
    if (!workingSnapshot) return false;
    setSaving(true); setError("");
    try {
      const response = await fetch(`${API_BASE}/positions/bulk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshotId: workingSnapshot.id, positions }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "明細を一括保存できませんでした。入力内容を確認してください。");
      setBulkModalOpen(false);
      await load();
      return true;
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "明細を一括保存できませんでした。");
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

  async function saveSnapshotSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!workingSnapshot) return;
    setSaving(true); setError("");
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
    try {
      const response = await fetch(`${API_BASE}/snapshots/${workingSnapshot.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "年度設定を保存できませんでした。");
      setSnapshotSettingsModalOpen(false);
      await load();
    } catch (error) { setError(error instanceof Error ? error.message : "年度設定を保存できませんでした。"); }
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
    try {
      const response = await fetch(`${API_BASE}/inheritance-estimate`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(form.entries()), householdId: portfolio.household.id }),
      });
      if (!response.ok) throw new Error();
      setForecastModalOpen(false);
      await load();
    } catch { setError("税金・費用を保存できませんでした。"); }
    finally { setSaving(false); }
  }

  async function saveFamilyMembers(members: FamilyMemberDraft[]) {
    if (!portfolio) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/family-members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId: portfolio.household.id, members }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error ?? "家族情報を保存できませんでした。");
      await load();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "家族情報を保存できませんでした。";
      setError(message);
      throw caught;
    } finally {
      setSaving(false);
    }
  }

  async function calculateInheritanceTaxViaApi() {
    if (!portfolio || taxApiStatus === "loading") return;
    setTaxApiStatus("loading");
    setError("");
    try {
      const response = await fetch(`${API_BASE}/inheritance-tax-calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ householdId: portfolio.household.id }),
      });
      const result = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(result?.error || "相続税を計算できませんでした。");
      await load();
      setBalanceScenario("with-tax");
      setTaxApiStatus("success");
      window.setTimeout(() => setTaxApiStatus("idle"), 3_000);
    } catch (caught) {
      setTaxApiStatus("idle");
      setError(caught instanceof Error ? caught.message : "相続税を計算できませんでした。");
    }
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
                  const { taxIncluded, displayedAssets, displayedAssetTotal, displayedTaxes, displayedSuccessionCosts, forecastAdjustments, displayedNetWorth, fundingAreaTotal, smallAreaItems, subtotals, clippedSubtotals } = balanceView(reportScenario);
                  const headingSuffix = reportScenario === "with-tax" ? "with-tax" : "without-tax";
                  return <article key={reportScenario} className={`panel balance-panel print-section-balance balance-report-${headingSuffix}`}>
                  {reportScenario === "with-tax" ? <p className="balance-print-owner">{portfolio.household.name}</p> : null}
                  <PanelHeader
                    title="貸借対照表"
                    subtitle={`${reportSnapshot.isCurrent ? "" : `${fiscalYearLabel(reportSnapshot)}・`}${taxIncluded ? "相続時予測（死亡保険金・税金を反映）" : "現在価値（保険は解約返戻金）"}`}
                    action={reportScenario === balanceScenario ? <div className="balance-panel-actions"><div className="balance-scenario-switch" role="group" aria-label="貸借対照表の表示パターン"><button type="button" aria-pressed={!taxIncluded} onClick={() => setBalanceScenario("without-tax")}><span>税金なし</span><small>メイン</small></button><button type="button" aria-pressed={taxIncluded} onClick={() => setBalanceScenario("with-tax")}><span>税金あり</span><small>サブ</small></button></div>{reportSnapshot.isCurrent ? <><button className="text-button compact tax-api-button" type="button" onClick={() => void calculateInheritanceTaxViaApi()} disabled={taxApiStatus === "loading"} aria-live="polite">{taxApiStatus === "loading" ? <LoaderCircle className="spin" /> : <Calculator />}{taxApiStatus === "success" ? "連携しました" : taxApiStatus === "loading" ? "計算中" : "APIで相続税を計算"}</button><button className="text-button compact" type="button" onClick={() => setForecastModalOpen(true)}>税金を入力</button></> : null}</div> : undefined}
                  />
                  {taxIncluded && successionAssets.insuranceDeathBenefitMissingCount > 0 ? <p className="insurance-data-note" role="note"><AlertTriangle />死亡保険金が未入力の保険 {successionAssets.insuranceDeathBenefitMissingCount}件は、税金ありB/Sでは0円として計算しています。</p> : null}
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
                      {displayedTaxes !== 0 ? <div className={`bs-account forecast-account grouped-account ${accountDensity(displayedTaxes, fundingAreaTotal)}`} style={{ height: areaHeight(displayedTaxes, fundingAreaTotal) }}>
                        <div className="bs-account-heading"><span>税金</span><strong><BsAmount value={displayedTaxes} total={displayedAssetTotal} /></strong></div>
                        <BsSubtotals items={subtotals.taxes} total={displayedAssetTotal} />
                      </div> : null}
                      {summary.liabilities !== 0 ? <div className={`bs-account medium-liability grouped-account ${accountDensity(summary.liabilities, fundingAreaTotal)}`} style={{ height: areaHeight(summary.liabilities, fundingAreaTotal) }}>
                        <div className="bs-account-heading"><span>借入金</span><strong><BsAmount value={summary.liabilities} total={displayedAssetTotal} /></strong></div>
                        <BsSubtotals items={subtotals.loans} total={displayedAssetTotal} />
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
                  {clippedSubtotals.length > 0 ? <div className="bs-subtotal-note" role="note" aria-label="枠内に収まらない小分類の内訳">
                    <span className="bs-subtotal-note-title">小分類の内訳</span>
                    {clippedSubtotals.map((account) => <span className="bs-subtotal-note-item" key={`${account.side}-${account.label}`}>
                      <strong>{account.label}</strong>
                      <span>{account.items.map((item) => `${item.label} ${compactYen(item.value)}（${percent.format(item.value / Math.max(displayedAssetTotal, 1) * 100)}%）`).join("／")}</span>
                    </span>)}
                  </div> : null}
                  <p className="guarantee-note" role="note">※ 個人保証残高（B/S外）：<strong>{compactYen(summary.guarantees)}</strong></p>
                </article>;
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
                <InheritanceTaxReport household={portfolio.household} snapshot={reportSnapshot} planning={portfolio.planning} calculation={reportSnapshot.inheritanceTaxCalculation} onRecalculate={section === "tax" && reportSnapshot.isCurrent ? () => void calculateInheritanceTaxViaApi() : undefined} recalculating={taxApiStatus === "loading"} />
                {section === "tax" && portfolio.planning.hasSpouse && portfolio.planning.heirRank === "rank1" ? <SecondaryInheritanceSimulator householdId={portfolio.household.id} /> : null}
              </>
              : section === "tax" ? <div className="tax-empty-state" role="note"><Calculator /><p>まだ相続税の概算を計算していません。</p><p>{reportSnapshot.isCurrent ? "上のボタンから、現在のB/Sと親族関係をもとに概算税額を計算できます。" : "概算は現在年度のB/Sで計算してください。"}</p></div>
              : null}
          </div> : null}

          {(section === "positions" || printSections?.has("details")) && workingSnapshot ? <div id="print-section-details" className={`report-document ${section !== "positions" ? "print-only-document" : ""} ${printSections && !printSections.has("details") ? "print-excluded-document" : ""}`}><AssetsView snapshot={workingSnapshot} snapshots={portfolio.snapshots} onSelectSnapshot={(snapshotId) => router.replace(sectionHref("positions", snapshotId))} onCreateNext={() => setYearCreationSourceId(workingSnapshot.id)} onAdd={openNewPosition} onBulkManage={() => setBulkModalOpen(true)} onEdit={openEditPosition} onDelete={setDeletingPosition} onReorder={(side, orderedIds) => reorderPositions(workingSnapshot.id, side, orderedIds)} onEditSettings={() => setSnapshotSettingsModalOpen(true)} onBack={workingSnapshot.isCurrent ? undefined : () => router.push(sectionHref("history"))} saving={saving} /></div> : null}
          {section === "profile" ? <div className="report-document print-excluded-document"><PersonView household={portfolio.household} referenceDate={reportSnapshot.asOfDate} saving={saving} saved={clientSaved} onSubmit={saveClient} onRequestDelete={() => { setError(""); setClientDeleteOpen(true); }} /></div> : null}
          {section === "family" ? <div className="report-document print-excluded-document"><FamilyView members={portfolio.familyMembers} referenceDate={reportSnapshot.asOfDate} saving={saving} onSave={saveFamilyMembers} /></div> : null}
          {(section === "history" || printSections?.has("history")) ? <div id="print-section-history" className={`report-document ${section !== "history" ? "print-only-document" : ""} ${printSections && !printSections.has("history") ? "print-excluded-document" : ""}`}><HistoryView key={portfolio.snapshots.map((snapshot) => snapshot.id).join("-")} snapshots={portfolio.snapshots} onCreate={() => setYearCreationSourceId(current.id)} onEditSnapshot={editSnapshot} onDeleteSnapshot={setDeletingSnapshot} saving={saving} /></div> : null}
          {section === "backup" ? <div className="report-document print-excluded-document"><BackupView scope="household" household={portfolio.household} /></div> : null}
        </main>
      </div>
      {menuOpen ? <button className="backdrop" aria-label="メニューを閉じる" onClick={() => setMenuOpen(false)} /> : null}
      {modalOpen ? <PositionModal position={editingPosition} people={familyPeopleNames} fxRates={workingSnapshot?.fxRates ?? {}} onClose={closePositionModal} onSubmit={savePosition} saving={saving} /> : null}
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
