"use client";

import { useId, useState } from "react";
import { dateJaWithWareki } from "@/lib/format";
import { fiscalYearLabel, institutionOrPropertyAddress, ownershipFraction, propertyArea, propertyTypeLabels, propertyTypeOf, type Position, type Snapshot } from "@/lib/portfolio-view";
import { normalizePropertyPlan, propertyPlanOptions, type PropertyPlan } from "@/lib/property-plan";
import { comparePositionClassification } from "@/lib/position-order";
import { ScrollRegion } from "@/components/scroll-region";

const amount = (value: number) => Math.floor(value).toLocaleString("ja-JP");

export function PropertyPlanReport({ snapshot, onEdit, onChangePlan }: { snapshot: Snapshot; onEdit?: (position: Position) => void; onChangePlan?: (position: Position, plan: PropertyPlan) => Promise<boolean> }) {
  const groupId = useId();
  const [pending, setPending] = useState<{ id: number; plan: PropertyPlan } | null>(null);
  const [message, setMessage] = useState("");
  async function changePlan(position: Position, plan: PropertyPlan) {
    if (!onChangePlan || pending || normalizePropertyPlan(position.assetDetails?.propertyPlan) === plan) return;
    setPending({ id: position.id, plan });
    setMessage("保存中です。");
    try {
      const ok = await onChangePlan(position, plan);
      setMessage(ok ? `${position.name}の方針を保存しました。` : "保存できませんでした。選択を元に戻しました。もう一度お試しください。");
    } catch {
      setMessage("保存できませんでした。選択を元に戻しました。もう一度お試しください。");
    } finally { setPending(null); }
  }
  const positions = [...snapshot.positions].sort(comparePositionClassification)
    .map((position, index) => ({ position, number: index + 1 }))
    .filter(({ position }) => propertyTypeOf(position) !== null);
  return <section className="panel property-plan-report">
    <header className="property-plan-report-heading">
      <h1>不動産の今後の方針</h1>
      <p>{fiscalYearLabel(snapshot)} ／ 基準日：{dateJaWithWareki(snapshot.asOfDate)} ／ {positions.length}件</p>
    </header>
    <p className="property-plan-report-help">方針が未登録の物件は「未定」と表示しています。方針は評価額・相続税の計算には影響しません。<span className="property-plan-screen-help">方針は1つ選ぶと保存されます。物件名から詳細を編集できます。</span></p>
    <p role="status" aria-live="polite" className="property-plan-save-status">{message}</p>
    {positions.length ? <ScrollRegion className="table-scroll" label="不動産の今後の方針"><table className="property-plan-report-table">
      <colgroup><col className="plan-no" /><col className="plan-type" /><col className="plan-name" /><col className="plan-address" /><col className="plan-area" /><col className="plan-share" /><col className="plan-value" />{propertyPlanOptions.map((option) => <col key={option.value} className="plan-choice" />)}</colgroup>
      {/* 物件を名称・所在地・評価額で見分けてから方針を読む順に、方針の5択は右端に置く */}
      <thead><tr><th scope="col" rowSpan={2} className="number">No.</th><th scope="col" rowSpan={2} className="plan-type-heading">土地・建物</th><th scope="col" rowSpan={2}>名称</th><th scope="col" rowSpan={2}>所在地</th><th scope="col" rowSpan={2} className="number">面積（㎡）</th><th scope="col" rowSpan={2} className="number">持分</th><th scope="col" rowSpan={2} className="number">評価額（円）</th><th scope="colgroup" colSpan={5} className="plan-group-heading">今後の方針</th></tr><tr>{propertyPlanOptions.map((option) => <th key={option.value} scope="col" className="plan-choice-heading">{option.label}</th>)}</tr></thead>
      <tbody>{positions.map(({ position, number }) => {
        const plan = pending?.id === position.id ? pending.plan : normalizePropertyPlan(position.assetDetails?.propertyPlan);
        const propertyType = propertyTypeOf(position)!;
        const area = propertyArea(position, propertyType);
        return <tr key={position.id}>
          <td className="number plan-no-cell">{number}</td>
          <td className="plan-type-cell">{propertyTypeLabels[propertyType]}</td>
          <td className="plan-name-cell">{onEdit ? <button type="button" className="property-plan-edit" onClick={() => onEdit(position)} aria-label={`${position.name}の方針を編集`}>{position.name}</button> : <strong>{position.name}</strong>}</td>
          <td className="plan-address-cell">{institutionOrPropertyAddress(position) || "—"}</td>
          <td className="number plan-area-cell" data-label="面積（㎡）">{area == null ? "—" : area.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}</td>
          <td className="number plan-share-cell" data-label="持分">{ownershipFraction(position) || "—"}</td>
          <td className="number plan-value-cell" data-label="評価額（円）">{amount(position.valueJpy)}</td>
          {propertyPlanOptions.map((option) => <td key={option.value} className={`plan-choice-cell ${plan === option.value ? "is-selected" : ""}`}>
            {onChangePlan ? <label className="property-plan-radio"><input type="radio" name={`${groupId}-plan-${position.id}`} aria-label={`${position.name}（No.${number}）：${option.label}`} checked={plan === option.value} disabled={pending !== null} onChange={() => void changePlan(position, option.value)} /><span className="sr-only property-plan-radio-label">{option.label}</span></label> : null}
            <span className={onChangePlan ? "property-plan-print-mark" : "property-plan-readonly-mark"} aria-hidden={onChangePlan ? true : undefined}>{plan === option.value ? "●" : "○"}</span>
          </td>)}
        </tr>;
      })}</tbody>
      <tfoot><tr><th colSpan={6} scope="row">合計</th><td className="number">{amount(positions.reduce((sum, { position }) => sum + position.valueJpy, 0))}</td><td colSpan={5} className="plan-total-blank" /></tr></tfoot>
    </table></ScrollRegion> : <p className="property-plan-empty">この年度には不動産が登録されていません。</p>}
  </section>;
}
