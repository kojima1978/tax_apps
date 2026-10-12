"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { List, Plus, Save, Scale, Search, Table2, UsersRound } from "lucide-react";
import { type MouseEvent, useMemo, useState } from "react";
import { CommaNumberInput } from "@/components/form-fields";
import { type Position, type PositionSection, type Snapshot, positionSection, middleClassification, middleClassificationRank, categoryRank, propertyTypeOf, deemedConfig, deemedAllocations, deemedBenefitJpy, splitBenefit, categoryLabels, fractionTotal, valuationDetailLine } from "@/lib/portfolio-view";
import { legalHeirMemberRoster, type FamilyMember } from "@/lib/family";
import { matchesSearchTerms, searchTerms } from "@/lib/clients";
import { yen, triangleYen } from "@/lib/format";
import { positionAllocationAmounts, positionAllocationLabel, positionCaption, positionDetailFields, positionKeyInfo } from "@/lib/position-display";
import { detailPageFor } from "@/lib/position-detail-pages";

type AllocationPayload = { positionId: number; amounts: Array<{ familyMemberId: number; amountJpy: number }> };
type AllocationSummary = { amountJpy: number };

const summaryExcludedLabels = new Set(["科目", "取得者", "負担者", "負担予定者", "所在地・金融機関等", "保管・所在場所", "受取人・取り分"]);

function summaryFieldPriority(position: Position) {
  if (position.category === "DEPOSIT") return ["預金種類", "支店", "口座番号（末尾）", "満期日"];
  if (position.category === "SECURITIES") return ["証券種類", "銘柄コード", "株数・口数", "単価"];
  if (position.category === "PRIVATE_SHARES") return ["株式種類", "発行済株式数", "評価方式", "銘柄コード"];
  if (["INSURANCE", "INSURANCE_RIGHTS"].includes(position.category)) return ["保険種類", "証券番号", "被保険者"];
  if (position.category === "RETIREMENT_ALLOWANCE") return ["退職金制度"];
  if (position.category === "BUSINESS_ASSETS") return ["資産種類", "事業名", "単価"];
  if (position.category === "COLLECTIBLES") return ["資産種類", "単価"];
  const propertyType = propertyTypeOf(position);
  if (propertyType === "BUILDING") return ["建物種類", "床面積", "構造", "持分"];
  if (propertyType === "LAND") return ["地目", "土地面積", "持分", "小規模宅地等の区分"];
  return ["資産種類", "事業名", "外貨金額", "円換算レート", "メモ"];
}

function positionSupplement(position: Position) {
  const config = deemedConfig(position);
  const excluded = new Set(summaryExcludedLabels);
  if (config) { excluded.add(config.surrenderLabel); excluded.add(config.label); }
  const fields = positionDetailFields(position).filter(([label]) => !excluded.has(label));
  const priorities = summaryFieldPriority(position);
  const rank = new Map(priorities.map((label, index) => [label, index]));
  return fields
    .map(([label, value], index) => ({ label, value, index, rank: rank.get(label) ?? priorities.length + index }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .slice(0, 2)
    .map(({ label, value }) => `${label}：${value}`);
}

function PositionSupplement({ position }: { position: Position }) {
  const lines = positionSupplement(position);
  if (lines.length === 0) return <>—</>;
  return <div className="position-summary-supplement" title={lines.join(" / ")}>{lines.map((line) => <span key={line}>{line}</span>)}</div>;
}

function PositionMoneyLines({ position, burden }: { position: Position; burden: number | null }) {
  const config = deemedConfig(position);
  const amount = config ? deemedBenefitJpy(position) : position.valueJpy;
  return <div className="position-summary-money-lines">
    <div><span>{config?.label ?? "評価額"}</span><strong>{yen.format(amount)}</strong></div>
    <div><span>相続税額</span><strong>{burden === null ? "—" : triangleYen(burden)}</strong></div>
  </div>;
}

function PositionValuationInfo({ position }: { position: Position }) {
  const calculationBasis = valuationDetailLine(position);
  return <><span className="position-summary-secondary-label">{calculationBasis ? "計算根拠" : "評価方法"}</span>{calculationBasis || position.valuationMethod || "—"}</>;
}

function MoneyColumnHeading() {
  return <><span className="position-summary-heading-main">評価額・給付額</span><span className="position-summary-heading-sub">／相続税額</span></>;
}

function allocationSummaries(position: Position, familyMembers: FamilyMember[]) {
  const result = new Map<number, AllocationSummary>();
  const config = deemedConfig(position);
  if (config) {
    const allocations = deemedAllocations(position);
    const amounts = splitBenefit(deemedBenefitJpy(position), allocations);
    allocations.forEach((allocation, index) => {
      const member = familyMembers.find((candidate) => candidate.name === allocation.recipient.trim());
      if (!member) return;
      const current = result.get(member.id)?.amountJpy ?? 0;
      const amountJpy = current + (amounts[index] ?? 0);
      result.set(member.id, { amountJpy });
    });
    return result;
  }
  for (const allocation of positionAllocationAmounts(position)) {
    result.set(allocation.familyMemberId, {
      amountJpy: allocation.amountJpy,
    });
  }
  return result;
}

function allocationTaxSummaries(burden: number | null, basis: number, allocations: Map<number, AllocationSummary>) {
  const byMember = new Map<number, number>();
  if (burden === null || basis <= 0) return { byMember, unallocatedTax: null };
  const allocated = [...allocations.values()].reduce((sum, allocation) => sum + allocation.amountJpy, 0);
  const weights = [
    ...[...allocations.entries()].map(([memberId, allocation], index) => ({ memberId, index, amount: allocation.amountJpy })),
    { memberId: null, index: allocations.size, amount: Math.max(0, basis - allocated) },
  ].filter((item) => item.amount > 0);
  const absoluteBurden = Math.abs(burden);
  const apportioned = weights.map((item) => {
    const exact = absoluteBurden * item.amount / basis;
    return { ...item, amountJpy: Math.floor(exact), fraction: exact - Math.floor(exact) };
  });
  const remainder = absoluteBurden - apportioned.reduce((sum, item) => sum + item.amountJpy, 0);
  const remainderOrder = [...apportioned].sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; index < remainder; index += 1) remainderOrder[index % remainderOrder.length].amountJpy += 1;
  const sign = burden < 0 ? -1 : 1;
  let unallocatedTax = 0;
  for (const item of apportioned) {
    if (item.memberId === null) unallocatedTax = sign * item.amountJpy;
    else byMember.set(item.memberId, sign * item.amountJpy);
  }
  return { byMember, unallocatedTax };
}

function listAllocationTotals(positions: Snapshot["positions"], familyMembers: FamilyMember[]) {
  const byMember = new Map(familyMembers.map((member) => [member.id, 0]));
  let netTotal = 0;
  let unallocatedTotal = 0;
  for (const position of positions) {
    const section = positionSection(position);
    if (section === "CONTINGENT" || (section === "LIABILITY" && !position.includedInNetWorth)) continue;
    const sign = section === "LIABILITY" ? -1 : 1;
    const basis = deemedConfig(position) ? deemedBenefitJpy(position) : position.valueJpy;
    const allocations = allocationSummaries(position, familyMembers);
    const allocated = [...allocations.values()].reduce((sum, allocation) => sum + allocation.amountJpy, 0);
    netTotal += sign * basis;
    unallocatedTotal += sign * Math.max(0, basis - allocated);
    for (const member of familyMembers) {
      byMember.set(member.id, (byMember.get(member.id) ?? 0) + sign * (allocations.get(member.id)?.amountJpy ?? 0));
    }
  }
  return { byMember, netTotal, unallocatedTotal };
}

function finalTaxTotals(snapshot: Snapshot, familyMembers: FamilyMember[]) {
  const calculation = snapshot.inheritanceTaxCalculation;
  const byMember = new Map<number, number>();
  if (!calculation) return { byMember, total: null, mode: null };

  const roster = legalHeirMemberRoster(familyMembers);
  const spouseTax = calculation.heirs.find((heir) => heir.id === "spouse" || heir.type === "spouse");
  if (roster.spouse && spouseTax) byMember.set(roster.spouse.id, spouseTax.finalTaxJpy);

  const rankedTaxes = calculation.heirs.filter((heir) => heir.type !== "spouse" && !heir.id?.startsWith("other:"));
  roster.heirs.forEach((member, index) => {
    const tax = rankedTaxes[index];
    if (tax) byMember.set(member.id, tax.finalTaxJpy);
  });
  for (const member of familyMembers) {
    const directTax = calculation.heirs.find((heir) => heir.id === `other:${member.id}`);
    if (directTax) byMember.set(member.id, directTax.finalTaxJpy);
  }
  return { byMember, total: calculation.totalInheritanceTaxJpy, mode: calculation.acquisitionAllocationMode };
}

function initialAllocationValues(positions: Snapshot["positions"], familyMembers: FamilyMember[]) {
  return Object.fromEntries(positions.map((position) => {
    const saved = new Map(positionAllocationAmounts(position).map((allocation) => [allocation.familyMemberId, allocation.amountJpy]));
    return [position.id, Object.fromEntries(familyMembers.map((member) => [member.id, String(saved.get(member.id) ?? "")]))];
  })) as Record<number, Record<number, string>>;
}

/** 法定相続分の端数を大きい順に1円ずつ配り、必ず評価額と一致させる。 */
function legalShareAmounts(valueJpy: number, legalHeirs: FamilyMember[]) {
  const exact = legalHeirs.map((member, index) => ({
    member,
    index,
    raw: valueJpy * member.civilShareNumerator! / member.civilShareDenominator!,
  }));
  const amounts = exact.map((item) => Math.floor(item.raw));
  const remainder = Math.round(valueJpy) - amounts.reduce((sum, amount) => sum + amount, 0);
  const order = [...exact].sort((a, b) => (b.raw - Math.floor(b.raw)) - (a.raw - Math.floor(a.raw)) || a.index - b.index);
  for (let index = 0; index < remainder; index += 1) amounts[order[index % order.length].index] += 1;
  return new Map(exact.map((item, index) => [item.member.id, amounts[index]]));
}

function AllocationMatrix({ rows, allPositions, familyMembers, saving, onSave, taxBurden, detailHref }: {
  rows: Snapshot["positions"];
  allPositions: Snapshot["positions"];
  familyMembers: FamilyMember[];
  saving: boolean;
  onSave: (positions: AllocationPayload[]) => Promise<boolean>;
  taxBurden: (position: Snapshot["positions"][number]) => number | null;
  detailHref: (position: Snapshot["positions"][number]) => string;
}) {
  const [values, setValues] = useState(() => initialAllocationValues(allPositions, familyMembers));
  const [dirtyIds, setDirtyIds] = useState<number[]>([]);
  const [bulkNotice, setBulkNotice] = useState("");
  const allEditablePositions = allPositions.filter((position) => !["INSURANCE", "RETIREMENT_ALLOWANCE"].includes(position.category));
  const legalHeirs = familyMembers.filter((member) => member.acquisitionReason === "INHERITANCE" && member.relationship !== "SELF");
  const legalSharesComplete = legalHeirs.length > 0 && legalHeirs.every((member) => (member.civilShareNumerator ?? 0) > 0 && (member.civilShareDenominator ?? 0) > 0);
  const legalShareTotal = legalSharesComplete ? fractionTotal(legalHeirs.map((member) => ({ numerator: member.civilShareNumerator!, denominator: member.civilShareDenominator! }))) : null;
  const legalSharesValid = legalShareTotal !== null && legalShareTotal.numerator === legalShareTotal.denominator;
  const legalShareError = legalHeirs.length === 0
    ? "法定相続人が登録されていません。"
    : !legalSharesComplete
      ? "法定相続分が未設定の相続人がいます。親族関係で設定してください。"
      : !legalSharesValid
        ? "法定相続分の合計が1になっていません。親族関係で確認してください。"
        : "";
  const rowTotal = (positionId: number) => familyMembers.reduce((sum, member) => sum + (Number(values[positionId]?.[member.id]) || 0), 0);
  const updateRow = (positionId: number, next: Record<number, string>) => {
    setValues((current) => ({ ...current, [positionId]: next }));
    setDirtyIds((current) => current.includes(positionId) ? current : [...current, positionId]);
  };
  const updateAmount = (positionId: number, familyMemberId: number, amount: string) => updateRow(positionId, { ...values[positionId], [familyMemberId]: amount });
  const assignFullAmount = (position: Snapshot["positions"][number], familyMemberId: number) => {
    updateRow(position.id, Object.fromEntries(familyMembers.map((member) => [member.id, member.id === familyMemberId ? String(position.valueJpy) : ""])));
  };
  const assignRemaining = (position: Snapshot["positions"][number], familyMemberId: number) => {
    const remaining = position.valueJpy - rowTotal(position.id);
    if (remaining <= 0) return;
    const currentAmount = Number(values[position.id]?.[familyMemberId]) || 0;
    updateAmount(position.id, familyMemberId, String(currentAmount + remaining));
  };
  const splitEvenly = (position: Snapshot["positions"][number]) => {
    if (familyMembers.length === 0) return;
    const base = Math.floor(position.valueJpy / familyMembers.length);
    const remainder = Math.round(position.valueJpy) - base * familyMembers.length;
    updateRow(position.id, Object.fromEntries(familyMembers.map((member, index) => [member.id, String(base + (index < remainder ? 1 : 0))])));
  };
  const clearRow = (positionId: number) => updateRow(positionId, Object.fromEntries(familyMembers.map((member) => [member.id, ""])));
  const applyLegalShares = () => {
    if (!legalSharesValid || allEditablePositions.length === 0) return;
    if (!window.confirm(`生命保険・退職金を除く全${allEditablePositions.length}件を法定相続分で割り振ります。現在の入力内容を置き換えてよろしいですか？`)) return;
    setValues((current) => {
      const next = { ...current };
      for (const position of allEditablePositions) {
        const amounts = legalShareAmounts(position.valueJpy, legalHeirs);
        next[position.id] = Object.fromEntries(familyMembers.map((member) => [member.id, String(amounts.get(member.id) ?? "")]));
      }
      return next;
    });
    setDirtyIds(allEditablePositions.map((position) => position.id));
    setBulkNotice(`${allEditablePositions.length}件に法定相続分を適用しました。内容を確認して保存してください。`);
  };
  const invalidRows = allEditablePositions.filter((position) => {
    const total = rowTotal(position.id);
    return dirtyIds.includes(position.id) && total !== 0 && total !== position.valueJpy;
  });
  const save = async () => {
    const targets = allEditablePositions.filter((position) => dirtyIds.includes(position.id)).map((position) => ({
      positionId: position.id,
      amounts: familyMembers.map((member) => ({ familyMemberId: member.id, amountJpy: Number(values[position.id]?.[member.id]) || 0 })).filter((amount) => amount.amountJpy > 0),
    }));
    if (await onSave(targets)) { setDirtyIds([]); setBulkNotice(""); }
  };

  if (familyMembers.length === 0) return <div className="allocation-empty"><strong>割り振り先が登録されていません</strong><p>先に「親族関係」で相続人・受遺者を登録してください。</p></div>;
  return <>
    <div className="allocation-toolbar">
      <div><strong>一覧内で割り振りを編集</strong><p>1行目に取得額・負担額を入力し、2行目の操作で全額や残額を設定できます。</p>{legalShareError ? <p id="legal-share-error" className="allocation-legal-share-error">{legalShareError}</p> : null}</div>
      <div className="allocation-toolbar-actions"><button type="button" className="button secondary" onClick={applyLegalShares} disabled={saving || !legalSharesValid || allEditablePositions.length === 0} aria-describedby={legalShareError ? "legal-share-error" : undefined}><Scale />全明細を法定相続分で割り振る</button><button type="button" className="button primary" onClick={() => void save()} disabled={saving || dirtyIds.length === 0 || invalidRows.length > 0}><Save />割り振りを保存</button></div>
    </div>
    <div className="position-summary-scroll allocation-inline-scroll" tabIndex={0} aria-label="資産・負債の割り振り編集。横にスクロールできます"><table className="position-summary-table allocation-inline-table" aria-label="財産の割り振り入力">
      <thead><tr><th className="center position-summary-sticky-section">区分</th><th className="position-summary-sticky-subject">科目・名称</th><th>所在地・金融機関等／評価情報</th><th className="number position-summary-sticky-money"><MoneyColumnHeading /></th>{familyMembers.map((member) => <th key={member.id} className="number position-summary-heir">{member.name}<span>取得・負担</span></th>)}<th className="number position-summary-unallocated">未割当</th><th>操作</th></tr></thead>
      {rows.map((position) => {
        const readOnly = ["INSURANCE", "RETIREMENT_ALLOWANCE"].includes(position.category);
        const total = rowTotal(position.id);
        const remaining = position.valueJpy - total;
        const burden = taxBurden(position);
        const benefitAllocations = allocationSummaries(position, familyMembers);
        return <tbody key={position.id} className={`position-summary-group ${remaining < 0 ? "allocation-row-error" : ""}`}>
          <tr className="position-summary-primary-row">
            <td rowSpan={2} className="center position-summary-sticky-section"><span className={`position-section-badge section-${positionSection(position)}`}>{positionSection(position) === "ASSET" ? "資産" : positionSection(position) === "LIABILITY" ? "負債" : "B/S外"}</span></td>
            <th scope="rowgroup" className="position-summary-sticky-subject"><Link href={detailHref(position)} className="position-summary-name"><span>{positionCaption(position)}</span><strong>{position.name || "名称未登録"}</strong></Link></th>
            <td className="position-summary-info" title={positionKeyInfo(position)}>{positionKeyInfo(position)}</td>
            <td rowSpan={2} className="number position-summary-sticky-money"><PositionMoneyLines position={position} burden={burden} /></td>
            {familyMembers.map((member) => {
              const benefitAllocation = benefitAllocations.get(member.id);
              return <td key={member.id} className="number allocation-person-cell">{readOnly ? (benefitAllocation ? yen.format(benefitAllocation.amountJpy) : "—") : <CommaNumberInput name={`allocation-${position.id}-${member.id}`} defaultValue="" value={values[position.id]?.[member.id] ?? ""} onValueChange={(value) => updateAmount(position.id, member.id, value)} maxFractionDigits={0} placeholder="0" required={false} ariaLabel={`${position.name}の${member.name}取得額`} />}</td>;
            })}
            <td className={`number position-summary-unallocated ${!readOnly && remaining !== 0 ? "has-unallocated" : ""}`}>{readOnly ? "受取人情報" : remaining > 0 ? yen.format(remaining) : remaining < 0 ? `超過 ${yen.format(Math.abs(remaining))}` : "—"}</td>
            <td rowSpan={2} className="allocation-inline-actions">{readOnly ? "—" : <><button type="button" className="button secondary compact" onClick={() => splitEvenly(position)}>均等割り</button><button type="button" className="button ghost compact" onClick={() => clearRow(position.id)}>クリア</button></>}</td>
          </tr>
          <tr className="position-summary-secondary-row">
            <td className="position-summary-sticky-subject"><PositionSupplement position={position} /></td>
            <td><PositionValuationInfo position={position} /></td>
            {familyMembers.map((member) => <td key={member.id} className="number position-summary-person-share">{readOnly ? null : <div className="allocation-quick-actions"><button type="button" className="allocation-full-button" onClick={() => assignFullAmount(position, member.id)} disabled={saving} aria-label={`${position.name}の全額を${member.name}へ割り振る`}>全額</button><button type="button" className="allocation-full-button" onClick={() => assignRemaining(position, member.id)} disabled={saving || remaining <= 0} aria-label={`${position.name}の残額すべてを${member.name}へ割り振る`}>残額すべて</button></div>}</td>)}
            <td className="number position-summary-unallocated" />
          </tr>
        </tbody>;
      })}
    </table></div>
    {invalidRows.length > 0 ? <p className="allocation-save-warning" role="alert">{invalidRows.length}件の割当合計が評価額と一致していません。</p> : <p className="allocation-save-status" aria-live="polite">{bulkNotice || (dirtyIds.length > 0 ? `${dirtyIds.length}件を変更中` : "保存済み")}</p>}
  </>;
}

export function PositionListView({ snapshot, detailHref, taxBurden, onAdd, onBulkManage, onSaveAllocations = async () => false, familyMembers = [], saving }: {
  snapshot: Snapshot; detailHref: string; taxBurden: (position: Snapshot["positions"][number]) => number | null;
  onAdd: (section: PositionSection) => void; onBulkManage: () => void; onSaveAllocations?: (positions: AllocationPayload[]) => Promise<boolean>; familyMembers?: FamilyMember[]; saving: boolean;
}) {
  const [allocationMode, setAllocationMode] = useState(false);
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const query = params.get("q") ?? "";
  const section = params.get("listSection") ?? "all";
  const category = params.get("listCategory") ?? "all";
  const sort = params.get("listSort") ?? "classification";
  function change(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "" || value === "all" || (key === "listSort" && value === "classification")) next.delete(key); else next.set(key, value);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }
  const rows = useMemo(() => {
    const terms = searchTerms(query);
    const filtered = snapshot.positions.filter((p) => (section === "all" || positionSection(p) === section) && (category === "all" || p.category === category) && matchesSearchTerms([p.name, positionKeyInfo(p), positionAllocationLabel(p), positionCaption(p), p.institution, p.note], terms));
    const sectionRank = { ASSET: 0, LIABILITY: 1, CONTINGENT: 2 };
    return filtered.sort((a, b) => sort === "value-desc" ? b.valueJpy - a.valueJpy || a.id - b.id : sort === "value-asc" ? a.valueJpy - b.valueJpy || a.id - b.id : sort === "registered" ? a.id - b.id : sectionRank[positionSection(a)] - sectionRank[positionSection(b)] || (middleClassificationRank.get(middleClassification(a)) ?? 99) - (middleClassificationRank.get(middleClassification(b)) ?? 99) || (categoryRank.get(a.category) ?? 99) - (categoryRank.get(b.category) ?? 99) || (propertyTypeOf(a) === "BUILDING" ? 1 : 0) - (propertyTypeOf(b) === "BUILDING" ? 1 : 0));
  }, [snapshot.positions, query, section, category, sort]);
  const categories = [...new Set(snapshot.positions.map((p) => p.category))];
  const allocationTotals = useMemo(() => listAllocationTotals(snapshot.positions, familyMembers), [snapshot.positions, familyMembers]);
  const taxTotals = useMemo(() => finalTaxTotals(snapshot, familyMembers), [snapshot, familyMembers]);
  function href(position: Snapshot["positions"][number]) {
    const [path, search] = detailHref.split("?");
    const next = new URLSearchParams(search);
    next.set("position", String(position.id)); next.delete("detailGroup");
    const page = detailPageFor(position);
    const root = path.replace(/\/positions(?:\/[^/]+)?$/, "/positions");
    return `${root}${page ? `/${page.key}` : ""}?${next}`;
  }
  return <>
    <h2 className="position-list-print-title">資産・負債一覧</h2>
    <section className="page-heading"><div><h2>資産・負債一覧</h2><p>{allocationMode ? "一覧の相続人列へ取得額・負担額を直接入力できます。" : "全区分を横断して比較・検索できます。名称を選ぶと詳細を開きます。"}</p></div><div className="page-heading-actions"><button className="button secondary allocation-mode-button" onClick={() => setAllocationMode((current) => !current)} disabled={saving}>{allocationMode ? <List /> : <UsersRound />}{allocationMode ? "編集を終了" : "割り振りを編集"}</button>{!allocationMode ? <><button className="button secondary" onClick={onBulkManage} disabled={saving}><Table2 />まとめて入力</button><button className="button primary" onClick={() => onAdd(section === "LIABILITY" || section === "CONTINGENT" ? section : "ASSET")} disabled={saving}><Plus />明細を追加</button></> : null}</div></section>
    <div className="position-list-filters">
      <label className="position-list-search"><span>検索</span><div><Search /><input type="search" aria-label="資産・負債を検索" value={query} onChange={(e) => change("q", e.target.value)} placeholder="名称・所在地・金融機関・受取人" /></div></label>
      <label>区分<select value={section} onChange={(e) => change("listSection", e.target.value)}><option value="all">すべて</option><option value="ASSET">資産</option><option value="LIABILITY">負債</option><option value="CONTINGENT">偶発債務（B/S外）</option></select></label>
      <label>科目<select value={category} onChange={(e) => change("listCategory", e.target.value)}><option value="all">すべて</option>{categories.map((c) => <option key={c} value={c}>{categoryLabels[c] ?? c}</option>)}</select></label>
      <label>表示順<select value={sort} onChange={(e) => change("listSort", e.target.value)}><option value="classification">区分・科目順</option><option value="value-desc">評価額の大きい順</option><option value="value-asc">評価額の小さい順</option><option value="registered">登録順</option></select></label>
    </div>
    <p className="position-result-count" aria-live="polite">{rows.length}件（全{snapshot.positions.length}件中）</p>
    <section className="panel position-summary-panel">
      <div className={allocationMode ? "" : "allocation-editor-hidden"}><AllocationMatrix key={`${snapshot.id}-${familyMembers.map((member) => member.id).join("-")}`} rows={rows} allPositions={snapshot.positions} familyMembers={familyMembers} saving={saving} onSave={onSaveAllocations} taxBurden={taxBurden} detailHref={href} /></div>
      <div className={allocationMode ? "allocation-view-hidden" : ""}><div className="position-summary-scroll" tabIndex={0} aria-label="資産・負債一覧。横にスクロールできます"><table className="position-summary-table" aria-label="資産・負債一覧">
      <thead><tr><th className="center position-summary-sticky-section">区分</th><th className="position-summary-sticky-subject">科目・名称</th><th>所在地・金融機関等／評価情報</th><th className="number position-summary-sticky-money"><MoneyColumnHeading /></th>{familyMembers.map((member) => <th key={member.id} className="number position-summary-heir">{member.name}<span>取得・負担／相続税額</span></th>)}<th className="number position-summary-unallocated">未割当</th><th className="position-summary-action-column"><span className="sr-only">詳細</span></th></tr></thead>
      {rows.map((p) => {
        const burden = taxBurden(p);
        const config = deemedConfig(p);
        const displayedAmount = config ? deemedBenefitJpy(p) : p.valueJpy;
        const allocations = allocationSummaries(p, familyMembers);
        const allocatedTotal = [...allocations.values()].reduce((sum, allocation) => sum + allocation.amountJpy, 0);
        const comparisonTotal = config ? deemedBenefitJpy(p) : p.valueJpy;
        const unallocated = Math.max(0, comparisonTotal - allocatedTotal);
        const allocatedTaxes = allocationTaxSummaries(burden, comparisonTotal, allocations);
        const navigate = (event: MouseEvent) => { if (!(event.target as HTMLElement).closest("a")) router.push(href(p)); };
        return <tbody key={p.id} className="position-summary-group" onClick={navigate}>
          <tr className="position-summary-primary-row">
            <td rowSpan={2} data-label="区分" className="center position-summary-sticky-section"><span className={`position-section-badge section-${positionSection(p)}`}>{positionSection(p) === "ASSET" ? "資産" : positionSection(p) === "LIABILITY" ? "負債" : "B/S外"}</span></td>
            <th scope="rowgroup" className="position-summary-sticky-subject"><Link href={href(p)} className="position-summary-name"><span>{positionCaption(p)}</span><strong>{p.name || "名称未登録"}</strong></Link></th>
            <td className="position-summary-info" title={positionKeyInfo(p)}>{positionKeyInfo(p)}</td>
            <td className="number position-summary-sticky-money position-summary-value-amount" aria-label={`${config?.label ?? "評価額"} ${yen.format(displayedAmount)}`}><strong>{yen.format(displayedAmount)}</strong></td>
            {familyMembers.map((member) => { const allocation = allocations.get(member.id); return <td key={member.id} className="number position-summary-person-amount">{allocation ? yen.format(allocation.amountJpy) : "—"}</td>; })}
            <td className={`number position-summary-unallocated ${unallocated > 0 ? "has-unallocated" : ""}`}>{unallocated > 0 ? yen.format(unallocated) : "—"}</td>
            <td rowSpan={2} className="position-summary-action-column"><Link href={href(p)} aria-label={`${p.name}の詳細`} className="position-summary-open">詳細</Link></td>
          </tr>
          <tr className="position-summary-secondary-row">
            <td className="position-summary-sticky-subject"><PositionSupplement position={p} /></td>
            <td><PositionValuationInfo position={p} /></td>
            <td className="number position-summary-sticky-money position-summary-tax-amount" aria-label={`相続税額 ${burden === null ? "未計算" : triangleYen(burden)}`}><strong>{burden === null ? "—" : triangleYen(burden)}</strong></td>
            {familyMembers.map((member) => { const tax = allocatedTaxes.byMember.get(member.id); return <td key={member.id} className="number position-summary-person-tax"><strong>{tax === undefined ? "—" : triangleYen(tax)}</strong></td>; })}
            <td className="number position-summary-unallocated position-summary-person-tax"><strong>{allocatedTaxes.unallocatedTax ? triangleYen(allocatedTaxes.unallocatedTax) : "—"}</strong></td>
          </tr>
        </tbody>;
      })}
      <tfoot className="position-summary-totals">
        <tr>
          <th scope="row" colSpan={3}><span>取得・負担合計</span><small>全明細</small></th>
          <td className="number position-summary-total-amount">{triangleYen(allocationTotals.netTotal)}</td>
          {familyMembers.map((member) => <td key={member.id} className="number position-summary-total-amount">{triangleYen(allocationTotals.byMember.get(member.id) ?? 0)}</td>)}
          <td className="number position-summary-unallocated">{allocationTotals.unallocatedTotal === 0 ? "—" : triangleYen(allocationTotals.unallocatedTotal)}</td>
          <td className="position-summary-action-column" />
        </tr>
        <tr>
          <th scope="row" colSpan={3}><span>相続税額</span><small>{taxTotals.mode === "ACTUAL" ? "取得・負担の登録内容で計算" : taxTotals.mode === "LEGAL" ? "法定相続分による概算" : "相続税の計算後に表示"}</small></th>
          <td className="number position-summary-total-tax">{taxTotals.total === null ? "—" : yen.format(taxTotals.total)}</td>
          {familyMembers.map((member) => <td key={member.id} className="number position-summary-total-tax">{taxTotals.byMember.has(member.id) ? yen.format(taxTotals.byMember.get(member.id)!) : "—"}</td>)}
          <td className="number position-summary-unallocated">—</td>
          <td className="position-summary-action-column" />
        </tr>
      </tfoot>
    </table></div>{rows.length === 0 ? <div className="position-detail-empty"><strong>{snapshot.positions.length ? "条件に一致する明細がありません" : "まだ明細が登録されていません"}</strong>{snapshot.positions.length ? <button className="button secondary" onClick={() => { const next = new URLSearchParams(params.toString()); ["q", "listSection", "listCategory"].forEach((k) => next.delete(k)); router.replace(`${pathname}?${next}`, { scroll: false }); }}>絞り込みを解除</button> : <button className="button primary" onClick={() => onAdd("ASSET")}><Plus />明細を追加</button>}</div> : null}</div>
    </section>
    <p className="position-list-note">{allocationMode ? "生命保険・退職金は詳細画面の受取人情報を相続税計算に使用します。" : "一覧では生命保険は死亡保険金、退職金は死亡退職金、それ以外は現在B/Sの評価額を表示します。相続税計算では生命保険・退職金の非課税額控除後の課税対象額を使用します。貸借対照表では生命保険・退職金を解約返戻金・解約手当金で表示し、生命保険契約に関する権利は解約返戻金相当額で評価します。"}</p>
  </>;
}
