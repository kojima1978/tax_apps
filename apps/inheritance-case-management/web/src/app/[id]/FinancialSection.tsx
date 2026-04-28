import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { Label } from "@/components/ui/Label"
import { Input } from "@/components/ui/Input"
import { CurrencyField } from "@/components/ui/CurrencyField"
import { CollapsibleSection } from "@/components/ui/CollapsibleSection"
import { Banknote, ArrowDown, BarChart3, Lightbulb, History, ChevronDown, ChevronRight } from "lucide-react"
import { formatCurrency } from "@/lib/analytics-utils"
import { calcEstimate, createFeeCalcSnapshot } from "@/lib/estimate-calc"
import type { FeeCalcSnapshot } from "@/lib/estimate-calc"
import { isCompleted } from "@/types/constants"
import type { InheritanceCase, SpecialAddition } from "@/types/shared"

type EstimateCountKey = "landRosenkaCount" | "landBairitsuCount" | "unlistedStockCount" | "heirCount"

const ESTIMATE_COUNT_FIELDS: { key: EstimateCountKey; label: string; suffix: string }[] = [
    { key: "landRosenkaCount", label: "土地数（路線価）", suffix: "区分" },
    { key: "landBairitsuCount", label: "土地数（倍率）", suffix: "区分" },
    { key: "unlistedStockCount", label: "非上場株式", suffix: "社" },
    { key: "heirCount", label: "相続人数", suffix: "名" },
]

interface FinancialSectionProps {
    formData: InheritanceCase
    netRevenue: number
    estimateNetRevenue: number
    isOpen?: boolean
    onToggle?: () => void
    currencyChange: (field: keyof InheritanceCase) => (value: string | undefined) => void
    setFormData: React.Dispatch<React.SetStateAction<InheritanceCase>>
    highlightFee?: boolean
}

export function FinancialSection({
    formData, netRevenue, estimateNetRevenue, isOpen, onToggle, currencyChange, setFormData, highlightFee,
}: FinancialSectionProps) {
    const estimateParams = {
        propertyValue: formData.propertyValue || 0,
        landRosenkaCount: formData.landRosenkaCount || 0,
        landBairitsuCount: formData.landBairitsuCount || 0,
        unlistedStockCount: formData.unlistedStockCount || 0,
        heirCount: formData.heirCount || 0,
    }
    const breakdown = calcEstimate(estimateParams)
    const specialAdditions = (formData.specialAdditions || []).slice(0, 2)
    const specialAdditionsTotal = specialAdditions.reduce((sum, a) => sum + (a.amount || 0), 0)
    const netEstimate = breakdown.total + specialAdditionsTotal - (formData.discountAmount || 0)
    const updateEstimateCount = (key: EstimateCountKey, rawValue: string) => {
        const value = rawValue === "" ? 0 : Math.max(0, Number.parseInt(rawValue, 10) || 0)
        setFormData(prev => ({ ...prev, [key]: value }))
    }

    const updateSpecialAddition = <K extends keyof SpecialAddition>(index: number, key: K, value: SpecialAddition[K]) => {
        const updated = [...specialAdditions]
        updated[index] = { ...updated[index], [key]: value }
        setFormData(prev => ({ ...prev, specialAdditions: updated.map((a, i) => ({ ...a, id: a.id || 0, sortOrder: i })) }))
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
            specialAdditions: specialAdditions.filter((_, i) => i !== index).map((a, i) => ({ ...a, sortOrder: i })),
        }))
    }

    const applyToEstimate = () => {
        const rate = formData.referralFeeRate || 0
        const newEstimateReferral = Math.floor(netEstimate * (rate / 100))
        const snapshot = createFeeCalcSnapshot(estimateParams, formData.discountAmount || 0, 'estimate', specialAdditions)
        setFormData(prev => ({
            ...prev,
            estimateAmount: netEstimate,
            estimateReferralFeeAmount: newEstimateReferral,
            feeCalcSnapshot: snapshot,
        }))
    }

    const applyToFee = () => {
        const rate = formData.referralFeeRate || 0
        const newReferralAmount = Math.floor(netEstimate * (rate / 100))
        const snapshot = createFeeCalcSnapshot(estimateParams, formData.discountAmount || 0, 'fee', specialAdditions)
        setFormData(prev => ({
            ...prev,
            feeAmount: netEstimate,
            referralFeeAmount: newReferralAmount,
            feeCalcSnapshot: snapshot,
        }))
    }

    return (
        <CollapsibleSection title="金額情報" icon={Banknote} isOpen={isOpen} onToggle={onToggle}>
            <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label htmlFor="propertyValue" className="text-xs">
                        遺産総額
                        <span className="ml-1 text-[6px] font-normal leading-tight text-muted-foreground">
                            （生前贈与加算額を含み、債務控除、非課税及び各種特例適用前）
                        </span>
                    </Label>
                    <CurrencyField
                        id="propertyValue"
                        name="propertyValue"
                        value={formData.propertyValue}
                        onValueChange={currencyChange("propertyValue")}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="taxAmount" className="text-xs">申告納税額</Label>
                    <CurrencyField
                        id="taxAmount"
                        name="taxAmount"
                        value={formData.taxAmount}
                        onValueChange={currencyChange("taxAmount")}
                    />
                </div>

                {/* 報酬計算 */}
                <div className="space-y-3 col-span-1 border rounded-lg bg-muted/30 p-3 sm:col-span-2">
                    <Label className="text-base font-semibold">報酬計算</Label>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
                    <div className="text-xs text-muted-foreground space-y-1 border-t pt-2">
                        <div className="flex justify-between"><span>基本報酬（遺産総額 × 0.8%）</span><span>{formatCurrency(breakdown.baseFee)}</span></div>
                        {breakdown.landRosenkaFee > 0 && <div className="flex justify-between"><span>加算：土地（路線価）{formData.landRosenkaCount}区分 × ¥10,000</span><span>{formatCurrency(breakdown.landRosenkaFee)}</span></div>}
                        {breakdown.landBairitsuFee > 0 && <div className="flex justify-between"><span>加算：土地（倍率）{formData.landBairitsuCount}区分 × ¥3,000</span><span>{formatCurrency(breakdown.landBairitsuFee)}</span></div>}
                        {breakdown.unlistedStockFee > 0 && <div className="flex justify-between"><span>加算：非上場株式 {formData.unlistedStockCount}社 × ¥100,000</span><span>{formatCurrency(breakdown.unlistedStockFee)}</span></div>}
                        {breakdown.heirFee > 0 && <div className="flex justify-between"><span>加算：相続人 {Math.min((formData.heirCount || 0) - 1, 4)}人 × ¥50,000</span><span>{formatCurrency(breakdown.heirFee)}</span></div>}
                        <div className="flex justify-between font-semibold border-t pt-1"><span>小計</span><span>{formatCurrency(breakdown.total)}</span></div>
                    </div>
                    <div className="space-y-2 rounded-lg border bg-background p-3">
                        <div className="flex items-center justify-between gap-3">
                            <Label className="text-sm font-semibold">特別業務報酬額</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addSpecialAddition}
                                disabled={specialAdditions.length >= 2}
                            >
                                + 追加
                            </Button>
                        </div>
                        {specialAdditions.length === 0 && (
                            <p className="text-xs text-muted-foreground">必要な場合のみ、内容と金額を最大2行まで追加できます。</p>
                        )}
                        {specialAdditions.map((addition, index) => (
                            <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]">
                                <Input
                                    value={addition.description}
                                    onChange={(e) => updateSpecialAddition(index, "description", e.target.value)}
                                    placeholder="内容"
                                />
                                <CurrencyField
                                    value={addition.amount || undefined}
                                    onValueChange={(value) => updateSpecialAddition(index, "amount", value ? Number(value) : 0)}
                                    placeholder="金額"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-10 px-2 text-gray-500 hover:text-gray-800"
                                    onClick={() => deleteSpecialAddition(index)}
                                >
                                    削除
                                </Button>
                            </div>
                        ))}
                        {specialAdditionsTotal > 0 && (
                            <div className="flex justify-between border-t pt-2 text-xs font-semibold text-muted-foreground">
                                <span>特別業務報酬額合計</span>
                                <span>{formatCurrency(specialAdditionsTotal)}</span>
                            </div>
                        )}
                    </div>
                    {/* 値引額 */}
                    <div className="space-y-1.5">
                        <Label htmlFor="discountAmount" className="text-xs">値引額</Label>
                        <CurrencyField
                            id="discountAmount"
                            name="discountAmount"
                            value={formData.discountAmount}
                            onValueChange={currencyChange("discountAmount")}
                        />
                    </div>
                    {/* 差引額 */}
                    <div className="text-xs text-muted-foreground border-t pt-2">
                        <div className="flex justify-between font-semibold text-sm">
                            <span>差引額</span>
                            <span>{formatCurrency(netEstimate)}</span>
                        </div>
                    </div>
                    {/* 転記ボタン */}
                    <div className="flex flex-wrap gap-2 pt-1">
                        <Button type="button" variant="outline" size="sm" onClick={applyToEstimate}>
                            <ArrowDown className="mr-1.5 h-3.5 w-3.5" />見積額に反映
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={applyToFee}>
                            <ArrowDown className="mr-1.5 h-3.5 w-3.5" />報酬額に反映
                        </Button>
                    </div>
                    {netEstimate > 0 && netEstimate !== (formData.feeAmount || 0) && netEstimate !== (formData.estimateAmount || 0) && (
                        <div className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-black">
                            <Lightbulb className="h-3.5 w-3.5 shrink-0" />
                            <span>概算報酬額 <strong>{formatCurrency(netEstimate)}</strong> が算出されています。上のボタンで見積額・報酬額に反映できます。</span>
                        </div>
                    )}
                    {formData.feeCalcSnapshot && (
                        <SnapshotDisplay snapshot={formData.feeCalcSnapshot} currentBreakdown={breakdown} currentSpecialAdditionsTotal={specialAdditionsTotal} currentDiscount={formData.discountAmount || 0} />
                    )}
                </div>

                {/* 紹介料・担当者売上 */}
                <div className="space-y-3 col-span-1 border rounded-lg bg-muted/30 p-3 sm:col-span-2">
                    <Label className="text-base font-semibold">紹介料・担当者売上</Label>
                    <div className="max-w-xs space-y-1.5">
                        <Label htmlFor="referralFeeRate" className="text-xs">紹介料率 (%)</Label>
                        <Input
                            id="referralFeeRate"
                            name="referralFeeRate"
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={formData.referralFeeRate?.toString() ?? ""}
                            onChange={(e) => {
                                const val = e.target.value
                                const rate = val === "" ? undefined : Number(val)
                                const currentFee = formData.feeAmount || 0
                                const newReferralAmount = rate !== undefined ? Math.floor(currentFee * (rate / 100)) : 0
                                const currentEstimate = formData.estimateAmount || 0
                                const newEstimateReferral = rate !== undefined ? Math.floor(currentEstimate * (rate / 100)) : 0
                                setFormData((prev) => ({ ...prev, referralFeeRate: rate, referralFeeAmount: newReferralAmount, estimateReferralFeeAmount: newEstimateReferral }))
                            }}
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                        {/* 見積書 */}
                        <div className="border rounded-lg bg-background p-3 space-y-2.5">
                            <Label className="text-sm font-semibold text-muted-foreground">見積書</Label>
                            <div className="space-y-1.5">
                                <Label htmlFor="estimateAmount" className="text-xs">見積額（税抜）</Label>
                                <CurrencyField
                                    id="estimateAmount"
                                    name="estimateAmount"
                                    value={formData.estimateAmount}
                                    onValueChange={(value) => {
                                        const newEstimate = value ? Number(value) : 0
                                        const rate = formData.referralFeeRate || 0
                                        const newEstimateReferral = Math.floor(newEstimate * (rate / 100))
                                        setFormData((prev) => ({ ...prev, estimateAmount: newEstimate, estimateReferralFeeAmount: newEstimateReferral }))
                                    }}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="estimateReferralFeeAmount" className="text-xs">紹介料額</Label>
                                <CurrencyField
                                    id="estimateReferralFeeAmount"
                                    name="estimateReferralFeeAmount"
                                    value={formData.estimateReferralFeeAmount || 0}
                                    onValueChange={currencyChange("estimateReferralFeeAmount")}
                                />
                            </div>
                            <div className="border-t pt-3">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-medium">手取り</span>
                                    <span className="text-lg font-bold">{formatCurrency(estimateNetRevenue)}</span>
                                </div>
                            </div>
                        </div>
                        {/* 請求書 */}
                        <div className={`border-2 rounded-lg bg-background p-3 space-y-2.5 transition-colors duration-500 ${highlightFee ? "border-black bg-white" : "border-primary/20"}`}>
                            <Label className="text-sm font-semibold">請求書</Label>
                            <div className="space-y-1.5">
                                <Label htmlFor="feeAmount" className="text-xs">報酬額（税抜）{highlightFee && <span className="text-black ml-1">← 入力してください</span>}</Label>
                                <CurrencyField
                                    id="feeAmount"
                                    name="feeAmount"
                                    value={formData.feeAmount}
                                    onValueChange={(value) => {
                                        const newFee = value ? Number(value) : 0
                                        const rate = formData.referralFeeRate || 0
                                        const newReferralAmount = Math.floor(newFee * (rate / 100))
                                        setFormData((prev) => ({ ...prev, feeAmount: newFee, referralFeeAmount: newReferralAmount }))
                                    }}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="referralFeeAmount" className="text-xs">紹介料額</Label>
                                <CurrencyField
                                    id="referralFeeAmount"
                                    name="referralFeeAmount"
                                    value={formData.referralFeeAmount || 0}
                                    onValueChange={currencyChange("referralFeeAmount")}
                                />
                            </div>
                            <div className="border-t pt-3">
                                <div className="flex justify-between items-end">
                                    <span className="text-sm font-medium">手取り</span>
                                    <span className="text-lg font-bold">{formatCurrency(netRevenue)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <AggregationStatus formData={formData} />
            </div>
        </CollapsibleSection>
    )
}

function SnapshotDisplay({ snapshot, currentBreakdown, currentSpecialAdditionsTotal, currentDiscount }: {
    snapshot: FeeCalcSnapshot;
    currentBreakdown: { baseFee: number; landRosenkaFee: number; landBairitsuFee: number; unlistedStockFee: number; heirFee: number; total: number };
    currentSpecialAdditionsTotal: number;
    currentDiscount: number;
}) {
    const [isOpen, setIsOpen] = useState(false)
    const currentNet = currentBreakdown.total + currentSpecialAdditionsTotal - currentDiscount
    const hasChanged = snapshot.netAmount !== currentNet

    return (
        <div className="border rounded-lg bg-slate-50 text-xs">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-slate-600 hover:text-slate-800 transition-colors"
            >
                <History className="h-3.5 w-3.5 shrink-0" />
                <span>
                    前回の計算根拠（{new Date(snapshot.calculatedAt).toLocaleDateString("ja-JP")}
                    ・{snapshot.appliedTo === "fee" ? "報酬額" : "見積額"}に反映）
                </span>
                {hasChanged && <span className="ml-auto text-black font-medium">現在と差異あり</span>}
                {isOpen ? <ChevronDown className="h-3.5 w-3.5 shrink-0 ml-auto" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 ml-auto" />}
            </button>
            {isOpen && (
                <div className="px-3 pb-3 space-y-2 border-t">
                    <div className="pt-2 space-y-1 text-slate-600">
                        <div className="font-semibold text-slate-700 mb-1">当時の料率</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                            <span>基本報酬率</span><span className="text-right">{(snapshot.rates.baseRate * 100).toFixed(1)}%</span>
                            <span>路線価（1区分）</span><span className="text-right">{formatCurrency(snapshot.rates.rosenkaUnit)}</span>
                            <span>倍率（1区分）</span><span className="text-right">{formatCurrency(snapshot.rates.bairitsuUnit)}</span>
                            <span>非上場株式（1社）</span><span className="text-right">{formatCurrency(snapshot.rates.stockUnit)}</span>
                            <span>相続人加算（1人）</span><span className="text-right">{formatCurrency(snapshot.rates.heirUnit)}</span>
                        </div>
                    </div>
                    <div className="space-y-1 text-slate-600 border-t pt-2">
                        <div className="font-semibold text-slate-700 mb-1">当時の計算結果</div>
                        <div className="flex justify-between"><span>基本報酬（遺産総額 {formatCurrency(snapshot.params.propertyValue)} × {(snapshot.rates.baseRate * 100).toFixed(1)}%）</span><span>{formatCurrency(snapshot.breakdown.baseFee)}</span></div>
                        {snapshot.breakdown.landRosenkaFee > 0 && <div className="flex justify-between"><span>加算：土地（路線価）{snapshot.params.landRosenkaCount}区分</span><span>{formatCurrency(snapshot.breakdown.landRosenkaFee)}</span></div>}
                        {snapshot.breakdown.landBairitsuFee > 0 && <div className="flex justify-between"><span>加算：土地（倍率）{snapshot.params.landBairitsuCount}区分</span><span>{formatCurrency(snapshot.breakdown.landBairitsuFee)}</span></div>}
                        {snapshot.breakdown.unlistedStockFee > 0 && <div className="flex justify-between"><span>加算：非上場株式 {snapshot.params.unlistedStockCount}社</span><span>{formatCurrency(snapshot.breakdown.unlistedStockFee)}</span></div>}
                        {snapshot.breakdown.heirFee > 0 && <div className="flex justify-between"><span>加算：相続人</span><span>{formatCurrency(snapshot.breakdown.heirFee)}</span></div>}
                        <div className="flex justify-between border-t pt-1"><span>小計</span><span>{formatCurrency(snapshot.breakdown.total)}</span></div>
                        {(snapshot.specialAdditions || []).map((addition, index) => (
                            <div key={index} className="flex justify-between">
                                <span>特別業務報酬：{addition.description}</span>
                                <span>{formatCurrency(addition.amount)}</span>
                            </div>
                        ))}
                        {(snapshot.specialAdditionsTotal || 0) > 0 && (
                            <div className="flex justify-between"><span>特別業務報酬額合計</span><span>{formatCurrency(snapshot.specialAdditionsTotal || 0)}</span></div>
                        )}
                        {snapshot.discountAmount > 0 && <div className="flex justify-between"><span>値引額</span><span>-{formatCurrency(snapshot.discountAmount)}</span></div>}
                        <div className="flex justify-between font-semibold"><span>転記額</span><span>{formatCurrency(snapshot.netAmount)}</span></div>
                    </div>
                    {hasChanged && (
                        <div className="flex items-center gap-1.5 rounded border border-black/10 bg-white px-2 py-1.5 text-black">
                            <Lightbulb className="h-3 w-3 shrink-0" />
                            <span>現在の差引額 {formatCurrency(currentNet)} と転記時 {formatCurrency(snapshot.netAmount)} に差異があります</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function AggregationStatus({ formData }: { formData: InheritanceCase }) {
    const completed = isCompleted(formData.status)
    const ongoing = formData.status === "手続中" && formData.acceptanceStatus === "受託"

    if (completed) {
        const amount = formData.feeAmount || 0
        return (
            <div className="col-span-1 flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-black sm:col-span-2">
                <BarChart3 className="h-4 w-4 shrink-0" />
                <span>ダッシュボード集計: <strong>確定額 {formatCurrency(amount)}</strong> として集計中</span>
            </div>
        )
    }

    if (ongoing) {
        const amount = formData.estimateAmount || 0
        return (
            <div className="col-span-1 flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-black sm:col-span-2">
                <BarChart3 className="h-4 w-4 shrink-0" />
                <span>ダッシュボード集計: <strong>見込額 {formatCurrency(amount)}</strong> として集計中</span>
            </div>
        )
    }

    return (
        <div className="col-span-1 flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm text-muted-foreground sm:col-span-2">
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span>ダッシュボード集計: 集計対象外（進み具合が「手続中」以降、かつ受託の場合に集計されます）</span>
        </div>
    )
}
