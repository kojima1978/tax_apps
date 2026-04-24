import { Button } from "@/components/ui/Button"
import { Label } from "@/components/ui/Label"
import { Input } from "@/components/ui/Input"
import { CurrencyField } from "@/components/ui/CurrencyField"
import { CollapsibleSection } from "@/components/ui/CollapsibleSection"
import { Banknote, ArrowDown, BarChart3 } from "lucide-react"
import { formatCurrency } from "@/lib/analytics-utils"
import { calcEstimate } from "@/lib/estimate-calc"
import { isCompleted } from "@/types/constants"
import type { InheritanceCase } from "@/types/shared"

const ESTIMATE_COUNT_FIELDS: { key: keyof InheritanceCase; label: string; suffix: string }[] = [
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
}

export function FinancialSection({
    formData, netRevenue, estimateNetRevenue, isOpen, onToggle, currencyChange, setFormData,
}: FinancialSectionProps) {
    const breakdown = calcEstimate({
        propertyValue: formData.propertyValue || 0,
        landRosenkaCount: formData.landRosenkaCount || 0,
        landBairitsuCount: formData.landBairitsuCount || 0,
        unlistedStockCount: formData.unlistedStockCount || 0,
        heirCount: formData.heirCount || 0,
    })

    const netEstimate = breakdown.total - (formData.discountAmount || 0)

    const applyToEstimate = () => {
        setFormData(prev => ({ ...prev, estimateAmount: netEstimate }))
    }

    const applyToFee = () => {
        const rate = formData.referralFeeRate || 0
        const newReferralAmount = Math.floor(netEstimate * (rate / 100))
        setFormData(prev => ({
            ...prev,
            feeAmount: netEstimate,
            referralFeeAmount: newReferralAmount,
        }))
    }

    return (
        <CollapsibleSection title="金額情報" icon={Banknote} isOpen={isOpen} onToggle={onToggle}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="propertyValue">遺産総額 <span className="text-[10px] font-normal text-muted-foreground">（生前贈与加算額を含み、債務控除、非課税及び各種特例適用前）</span></Label>
                    <CurrencyField
                        id="propertyValue"
                        name="propertyValue"
                        value={formData.propertyValue}
                        onValueChange={currencyChange("propertyValue")}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="taxAmount">申告納税額</Label>
                    <CurrencyField
                        id="taxAmount"
                        name="taxAmount"
                        value={formData.taxAmount}
                        onValueChange={currencyChange("taxAmount")}
                    />
                </div>

                {/* 報酬計算 */}
                <div className="space-y-4 col-span-1 md:col-span-2 border rounded-lg p-4 bg-muted/30">
                    <Label className="text-base font-semibold">報酬計算</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                                        value={(formData[key] as number) || 0}
                                        onChange={(e) => {
                                            const val = Math.max(0, parseInt(e.target.value) || 0)
                                            setFormData(prev => ({ ...prev, [key]: val }))
                                        }}
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
                    {/* 値引額 */}
                    <div className="space-y-1">
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
                            <span>{formatCurrency(breakdown.total - (formData.discountAmount || 0))}</span>
                        </div>
                    </div>
                    {/* 転記ボタン */}
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" size="sm" onClick={applyToEstimate}>
                            <ArrowDown className="mr-1.5 h-3.5 w-3.5" />見積額に反映
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={applyToFee}>
                            <ArrowDown className="mr-1.5 h-3.5 w-3.5" />報酬額に反映
                        </Button>
                    </div>
                </div>

                {/* 紹介料・担当者売上 */}
                <div className="space-y-4 col-span-1 md:col-span-2 border rounded-lg p-4 bg-muted/30">
                    <Label className="text-base font-semibold">紹介料・担当者売上</Label>
                    <div className="max-w-xs space-y-2">
                        <Label htmlFor="referralFeeRate">紹介料率 (%)</Label>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        {/* 見積ベース */}
                        <div className="border rounded-lg p-4 bg-background space-y-3">
                            <Label className="text-sm font-semibold text-muted-foreground">見積ベース</Label>
                            <div className="space-y-2">
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
                            <div className="space-y-2">
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
                        {/* 確定ベース */}
                        <div className="border-2 border-primary/20 rounded-lg p-4 bg-background space-y-3">
                            <Label className="text-sm font-semibold">確定ベース</Label>
                            <div className="space-y-2">
                                <Label htmlFor="feeAmount" className="text-xs">報酬額（税抜）</Label>
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
                            <div className="space-y-2">
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

function AggregationStatus({ formData }: { formData: InheritanceCase }) {
    const completed = isCompleted(formData.status)
    const ongoing = formData.status === "手続中" && formData.acceptanceStatus === "受託可"

    if (completed) {
        const amount = formData.feeAmount || 0
        return (
            <div className="col-span-1 md:col-span-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <BarChart3 className="h-4 w-4 shrink-0" />
                <span>ダッシュボード集計: <strong>確定額 {formatCurrency(amount)}</strong> として集計中</span>
            </div>
        )
    }

    if (ongoing) {
        const amount = formData.estimateAmount || 0
        return (
            <div className="col-span-1 md:col-span-2 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <BarChart3 className="h-4 w-4 shrink-0" />
                <span>ダッシュボード集計: <strong>見込額 {formatCurrency(amount)}</strong> として集計中</span>
            </div>
        )
    }

    return (
        <div className="col-span-1 md:col-span-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-muted-foreground">
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span>ダッシュボード集計: 集計対象外（進み具合が「手続中」以降、かつ受託可の場合に集計されます）</span>
        </div>
    )
}
