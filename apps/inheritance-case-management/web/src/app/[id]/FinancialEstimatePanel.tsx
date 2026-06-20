import { useState } from "react"
import { ArrowDown, Lightbulb } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { CurrencyField } from "@/components/ui/CurrencyField"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { formatCurrency } from "@/lib/analytics-utils"
import { calcEstimate, createFeeCalcSnapshot } from "@/lib/estimate-calc"
import type { CaseSpecialAdditionItem, InheritanceCase } from "@/types/shared"
import { FeeSnapshotDisplay } from "./FeeSnapshotDisplay"
import {
    ESTIMATE_COUNT_FIELDS,
    getEstimateParams,
    getReferralAmount,
    getSpecialAdditions,
    getSpecialAdditionsTotal,
    normalizeSpecialAdditions,
    parseEstimateCount,
    type EstimateCountKey,
} from "./financial-section-utils"

interface FinancialEstimatePanelProps {
    formData: InheritanceCase
    currencyChange: (field: keyof InheritanceCase) => (value: string | undefined) => void
    setFormData: React.Dispatch<React.SetStateAction<InheritanceCase>>
}

export function FinancialEstimatePanel({ formData, currencyChange, setFormData }: FinancialEstimatePanelProps) {
    const estimateParams = getEstimateParams(formData)
    const breakdown = calcEstimate(estimateParams)
    const specialAdditions = getSpecialAdditions(formData)
    const specialAdditionsTotal = getSpecialAdditionsTotal(specialAdditions)
    const netEstimate = breakdown.total + specialAdditionsTotal - (formData.discountAmount || 0)
    const [isSpecialAdditionsOpen, setIsSpecialAdditionsOpen] = useState(specialAdditions.length > 0)

    const updateEstimateCount = (key: EstimateCountKey, rawValue: string) => {
        setFormData(prev => ({ ...prev, [key]: parseEstimateCount(rawValue) }))
    }

    const updateSpecialAddition = <K extends keyof CaseSpecialAdditionItem>(index: number, key: K, value: CaseSpecialAdditionItem[K]) => {
        const updated = [...specialAdditions]
        updated[index] = { ...updated[index], [key]: value }
        setFormData(prev => ({ ...prev, specialAdditions: normalizeSpecialAdditions(updated) }))
    }

    const addSpecialAddition = () => {
        if (specialAdditions.length >= 2) return
        setFormData(prev => ({
            ...prev,
            specialAdditions: [...specialAdditions, { id: 0, sortOrder: specialAdditions.length, description: "", amount: 0 }],
        }))
    }

    const deleteSpecialAddition = (index: number) => {
        setFormData(prev => ({
            ...prev,
            specialAdditions: normalizeSpecialAdditions(specialAdditions.filter((_, i) => i !== index)),
        }))
    }

    const applyToEstimate = () => {
        const snapshot = createFeeCalcSnapshot(estimateParams, formData.discountAmount || 0, "estimate", specialAdditions)
        setFormData(prev => ({
            ...prev,
            estimateAmount: netEstimate,
            estimateReferralFeeAmount: getReferralAmount(netEstimate, formData.referralFeeRate),
            feeCalcSnapshot: snapshot,
        }))
    }

    const applyToFee = () => {
        const snapshot = createFeeCalcSnapshot(estimateParams, formData.discountAmount || 0, "fee", specialAdditions)
        setFormData(prev => ({
            ...prev,
            feeAmount: netEstimate,
            referralFeeAmount: getReferralAmount(netEstimate, formData.referralFeeRate),
            feeCalcSnapshot: snapshot,
        }))
    }

    return (
        <div className="col-span-1 space-y-2 rounded-lg border bg-muted/30 p-2.5 sm:col-span-2">
            <Label className="text-sm font-semibold">報酬計算</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {ESTIMATE_COUNT_FIELDS.map(({ key, label, suffix }) => (
                    <div key={key} className="space-y-1">
                        <Label htmlFor={key} className="text-xs">{label}</Label>
                        <div className="flex items-center gap-1">
                            <Input
                                id={key}
                                name={key}
                                type="number"
                                min="0"
                                className="w-full"
                                value={estimateParams[key]}
                                onChange={(e) => updateEstimateCount(key, e.target.value)}
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">{suffix}</span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="space-y-0.5 border-t pt-1.5 text-[11px] text-muted-foreground">
                <div className="flex justify-between"><span>基本報酬（遺産総額 × 0.8%）</span><span>{formatCurrency(breakdown.baseFee)}</span></div>
                {breakdown.landRosenkaFee > 0 && <div className="flex justify-between"><span>加算：土地（路線価）{formData.landRosenkaCount}区分 × ¥10,000</span><span>{formatCurrency(breakdown.landRosenkaFee)}</span></div>}
                {breakdown.landBairitsuFee > 0 && <div className="flex justify-between"><span>加算：土地（倍率）{formData.landBairitsuCount}区分 × ¥3,000</span><span>{formatCurrency(breakdown.landBairitsuFee)}</span></div>}
                {breakdown.unlistedStockFee > 0 && <div className="flex justify-between"><span>加算：非上場株式 {formData.unlistedStockCount}社 × ¥100,000</span><span>{formatCurrency(breakdown.unlistedStockFee)}</span></div>}
                {breakdown.heirFee > 0 && <div className="flex justify-between"><span>加算：相続人 {Math.min((formData.heirCount || 0) - 1, 4)}人 × ¥50,000</span><span>{formatCurrency(breakdown.heirFee)}</span></div>}
                <div className="flex justify-between font-semibold border-t pt-1"><span>小計</span><span>{formatCurrency(breakdown.total)}</span></div>
            </div>
            <details
                className="group rounded-md border bg-background px-2.5 py-1.5"
                open={isSpecialAdditionsOpen}
                onToggle={(event) => setIsSpecialAdditionsOpen(event.currentTarget.open)}
            >
                <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold">
                    <span>特別業務報酬額</span>
                    <span className="text-[10px] font-normal text-muted-foreground">{specialAdditions.length}/2件</span>
                    <span className="ml-auto text-[10px] font-normal text-muted-foreground group-open:hidden">必要な場合のみ入力</span>
                </summary>
                <div className="mt-2 space-y-2 border-t pt-2">
                    <div className="flex justify-end">
                        <Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={addSpecialAddition} disabled={specialAdditions.length >= 2}>
                            + 追加
                        </Button>
                    </div>
                    {specialAdditions.map((addition, index) => (
                        <div key={index} className="grid grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,1fr)_150px_auto]">
                            <Input value={addition.description} onChange={(e) => updateSpecialAddition(index, "description", e.target.value)} placeholder="内容" />
                            <CurrencyField value={addition.amount || undefined} onValueChange={(value) => updateSpecialAddition(index, "amount", value ? Number(value) : 0)} placeholder="金額" />
                            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs text-gray-500 hover:text-gray-800" onClick={() => deleteSpecialAddition(index)}>
                                削除
                            </Button>
                        </div>
                    ))}
                    {specialAdditionsTotal > 0 && (
                        <div className="flex justify-between border-t pt-1.5 text-xs font-semibold text-muted-foreground">
                            <span>合計</span><span>{formatCurrency(specialAdditionsTotal)}</span>
                        </div>
                    )}
                </div>
            </details>
            <div className="flex flex-wrap items-end justify-between gap-2 border-t pt-2">
                <div className="w-full space-y-1 sm:w-44">
                    <Label htmlFor="discountAmount" className="text-[11px]">値引額</Label>
                    <CurrencyField id="discountAmount" name="discountAmount" value={formData.discountAmount} onValueChange={currencyChange("discountAmount")} />
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    <div className="mr-1 text-right">
                        <div className="text-[10px] text-muted-foreground">差引額</div>
                        <div className="text-sm font-bold">{formatCurrency(netEstimate)}</div>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={applyToEstimate}>
                        <ArrowDown className="mr-1 h-3 w-3" />見積へ反映
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={applyToFee}>
                        <ArrowDown className="mr-1 h-3 w-3" />報酬へ反映
                    </Button>
                </div>
            </div>
            {netEstimate > 0 && netEstimate !== (formData.feeAmount || 0) && netEstimate !== (formData.estimateAmount || 0) && (
                <div className="flex items-center gap-2 rounded-md border border-black/10 bg-white px-2.5 py-1.5 text-[11px] text-black">
                    <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                    <span>概算報酬額 <strong>{formatCurrency(netEstimate)}</strong> が算出されています。上のボタンで見積額・報酬額に反映できます。</span>
                </div>
            )}
            {formData.feeCalcSnapshot && (
                <FeeSnapshotDisplay
                    snapshot={formData.feeCalcSnapshot}
                    currentBreakdown={breakdown}
                    currentSpecialAdditionsTotal={specialAdditionsTotal}
                    currentDiscount={formData.discountAmount || 0}
                />
            )}
        </div>
    )
}
