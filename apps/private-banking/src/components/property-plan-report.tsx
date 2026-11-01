"use client";

import { useId, useState } from "react";
import { dateJa } from "@/lib/format";
import { fiscalYearLabel, institutionOrPropertyAddress, ownershipFraction, propertyArea, propertyTypeLabels, propertyTypeOf, type Position, type Snapshot } from "@/lib/portfolio-view";
import { normalizePropertyPlan, propertyPlanOptions, type PropertyPlan } from "@/lib/property-plan";
import { comparePositionClassification } from "@/lib/position-order";

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
      <h2>不動産の保有・処分方針一覧</h2>
      <p>{fiscalYearLabel(snapshot)} ／ 基準日：{dateJa(snapshot.asOfDate)} ／ {positions.length}件</p>
    </header>
    <p className="property-plan-report-help">方針が未登録の物件は「未定」と表示しています。方針は評価額・相続税の計算には影響しません。<span className="property-plan-screen-help">方針は1つ選ぶと保存されます。物件名から詳細を編集できます。</span></p>
    <p role="status" aria-live="polite" className="property-plan-save-status">{message}</p>
    {positions.length ? <div className="table-scroll"><table className="property-plan-report-table">
      <colgroup>{propertyPlanOptions.map((option) => <col key={option.value} className="plan-choice" />)}<col className="plan-no" /><col className="plan-type" /><col className="plan-name" /><col className="plan-address" /><col className="plan-area" /><col className="plan-share" /><col className="plan-value" /></colgroup>
      <thead><tr><th scope="colgroup" colSpan={5} className="plan-group-heading">今後の方針</th><th scope="col" rowSpan={2} className="number">No.</th><th scope="col" rowSpan={2} className="plan-type-heading">土地・建物</th><th scope="col" rowSpan={2}>名称</th><th scope="col" rowSpan={2}>所在地</th><th scope="col" rowSpan={2} className="number">面積（㎡）</th><th scope="col" rowSpan={2} className="number">持分</th><th scope="col" rowSpan={2} className="number">評価額（円）</th></tr><tr>{propertyPlanOptions.map((option) => <th key={option.value} scope="col" className="plan-choice-heading">{option.label}</th>)}</tr></thead>
      <tbody>{positions.map(({ position, number }) => {
        const plan = pending?.id === position.id ? pending.plan : normalizePropertyPlan(position.assetDetails?.propertyPlan);
        const propertyType = propertyTypeOf(position)!;
        const area = propertyArea(position, propertyType);
        return <tr key={position.id}>
          {propertyPlanOptions.map((option) => <td key={option.value} className={`plan-choice-cell ${plan === option.value ? "is-selected" : ""}`}>
            {onChangePlan ? <label className="property-plan-radio"><input type="radio" name={`${groupId}-plan-${position.id}`} aria-label={`${position.name}（No.${number}）：${option.label}`} checked={plan === option.value} disabled={pending !== null} onChange={() => void changePlan(position, option.value)} /><span className="sr-only">{option.label}</span></label> : null}
            <span className={onChangePlan ? "property-plan-print-mark" : "property-plan-readonly-mark"} aria-hidden={onChangePlan ? true : undefined}>{plan === option.value ? "●" : "○"}</span>
          </td>)}
          <td className="number">{number}</td>
          <td>{propertyTypeLabels[propertyType]}</td>
          <td>{onEdit ? <button type="button" className="property-plan-edit" onClick={() => onEdit(position)} aria-label={`${position.name}の方針を編集`}>{position.name}</button> : <strong>{position.name}</strong>}</td>
          <td>{institutionOrPropertyAddress(position) || "—"}</td>
          <td className="number">{area == null ? "—" : area.toLocaleString("ja-JP", { maximumFractionDigits: 2 })}</td>
          <td className="number plan-share-cell">{ownershipFraction(position) || "—"}</td>
          <td className="number">{amount(position.valueJpy)}</td>
        </tr>;
      })}</tbody>
      <tfoot><tr><th colSpan={11} scope="row">合計</th><td className="number">{amount(positions.reduce((sum, { position }) => sum + position.valueJpy, 0))}</td></tr></tfoot>
    </table></div> : <p className="property-plan-empty">この年度には不動産が登録されていません。</p>}
  </section>;
}
