"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { personSelectOptions } from "@/lib/family";
import { fractionTotal, splitBenefit, type BenefitAllocation } from "@/lib/portfolio-view";
import { formatCommaNumberInput } from "@/lib/format";
import { contractAmountText } from "@/lib/fx-rates";


export type BulkBenefitDraft = { recipient: string; numerator: string; denominator: string };
export const benefitDrafts = (allocations: BenefitAllocation[]): BulkBenefitDraft[] => allocations.map((item) => ({ recipient: item.recipient, numerator: String(item.numerator), denominator: String(item.denominator) }));
export const benefitValues = (drafts: BulkBenefitDraft[]): BenefitAllocation[] => drafts.map((item) => ({ recipient: item.recipient.trim(), numerator: Number(item.numerator), denominator: Number(item.denominator) }));

export function benefitDraftError(drafts: BulkBenefitDraft[]) {
  if (drafts.length < 2) return "";
  const values = benefitValues(drafts);
  if (values.some((item) => !item.recipient)) return "受取人を全員選択してください。";
  if (new Set(values.map((item) => item.recipient)).size !== values.length) return "同じ受取人が重複しています。";
  if (values.some((item) => !Number.isSafeInteger(item.numerator) || !Number.isSafeInteger(item.denominator) || item.numerator <= 0 || item.denominator <= 0)) return "分子・分母は1以上の整数で入力してください。";
  const total = fractionTotal(values);
  if (!total || total.numerator !== total.denominator || !Number.isSafeInteger(total.denominator)) return "受取割合の合計が1（100％）になるように入力してください。";
  return "";
}

/** 表の行の直下で使う制御コンポーネント。閉じても配分の下書きは親の行に残す。 */
export function BulkBenefitRecipients({ drafts, benefit, people, legalHeirNames, rowLabel, onChange, onClose, currency = "JPY", fxRate = 1 }: {
  drafts: BulkBenefitDraft[]; benefit: string; people: string[]; legalHeirNames: ReadonlySet<string>; rowLabel: string;
  onChange: (drafts: BulkBenefitDraft[]) => void; onClose: () => void;
  currency?: string; fxRate?: number | null;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const previousCount = useRef(0);
  useEffect(() => {
    if (previousCount.current === drafts.length) return;
    const controls = panelRef.current?.querySelectorAll<HTMLSelectElement>("select");
    const target = previousCount.current === 0 ? controls?.[0] : controls?.[drafts.length - 1];
    target?.focus({ preventScroll: true });
    panelRef.current?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    previousCount.current = drafts.length;
  }, [drafts.length]);
  const error = benefitDraftError(drafts);
  const values = benefitValues(drafts);
  const total = fractionTotal(values);
  const amount = Number(benefit.replace(/,/g, "")) || 0;
  const amounts = error ? [] : splitBenefit(amount, values, currency === "JPY" ? 1 : 0.01);
  const amountsJpy = error || fxRate === null ? [] : splitBenefit(Math.round(amount * fxRate), values);
  const update = (index: number, patch: Partial<BulkBenefitDraft>) => onChange(drafts.map((item, at) => at === index ? { ...item, ...patch } : item));
  const evenly = drafts.every((item) => Number(item.numerator) === 1 && Number(item.denominator) === drafts.length);
  const resize = (next: BulkBenefitDraft[]) => onChange(next.length === 1 || evenly ? next.map((item) => ({ ...item, numerator: "1", denominator: String(next.length) })) : next);
  return <section ref={panelRef} className="bulk-benefit-editor" aria-label={`${rowLabel}の受取人設定`}>
    <header><div><strong>{rowLabel}の受取人設定</strong><p>死亡保険金：{contractAmountText(amount, currency)}／割合は分数で入力します。</p>{currency !== "JPY" ? <p>{fxRate === null ? "円換算レート未登録" : `円換算 ${contractAmountText(Math.round(amount * fxRate), "JPY")}`}</p> : null}</div><button type="button" className="button secondary" onClick={onClose}>設定を閉じる</button></header>
    {drafts.map((item, index) => <div className="bulk-benefit-person" key={index}>
      <label>受取人{index + 1}<select aria-label={`${rowLabel} 受取人${index + 1}`} value={item.recipient} onChange={(event) => update(index, { recipient: event.target.value })}><option value="">未選択</option>{personSelectOptions(people, item.recipient).map((name) => <option value={name} key={name}>{name}</option>)}</select><small>{item.recipient ? legalHeirNames.has(item.recipient.trim()) ? "法定相続人" : "法定相続人以外" : "親族関係に登録した方から選択"}</small></label>
      <div className="bulk-benefit-fraction"><label>分子<input aria-label={`${rowLabel} 受取人${index + 1}の分子`} inputMode="numeric" readOnly={drafts.length === 1} value={item.numerator} onChange={(event) => update(index, { numerator: formatCommaNumberInput(event.target.value, 0).replace(/,/g, "") })} /></label><span aria-hidden="true">／</span><label>分母<input aria-label={`${rowLabel} 受取人${index + 1}の分母`} inputMode="numeric" readOnly={drafts.length === 1} value={item.denominator} onChange={(event) => update(index, { denominator: formatCommaNumberInput(event.target.value, 0).replace(/,/g, "") })} /></label></div>
      <output aria-label={`${rowLabel} 受取人${index + 1}の配分額`}>{amounts[index] === undefined ? "—" : contractAmountText(amounts[index], currency)}{currency !== "JPY" ? <small>{amountsJpy[index] === undefined ? "円換算未確定" : `円換算 ${contractAmountText(amountsJpy[index], "JPY")}`}</small> : null}</output>
      <button type="button" className="icon-button danger" aria-label={`${rowLabel} 受取人${index + 1}を削除`} disabled={drafts.length === 1} onClick={() => resize(drafts.filter((_, at) => at !== index))}><Trash2 /></button>
    </div>)}
    <p className={error ? "bulk-benefit-error" : "bulk-benefit-total"} aria-live="polite">{error || `割合の合計：${total?.numerator}/${total?.denominator}（100％）`}</p>
    <button type="button" className="button secondary" disabled={drafts.length >= 10} onClick={() => resize([...drafts, { recipient: "", numerator: "1", denominator: "1" }])}><Plus />受取人を追加</button>
  </section>;
}
