import { Button } from "@/components/ui/Button"
import { Label } from "@/components/ui/Label"
import { Input } from "@/components/ui/Input"
import { CurrencyField } from "@/components/ui/CurrencyField"
import { CollapsibleSection } from "@/components/ui/CollapsibleSection"
import { Banknote, ArrowDown } from "lucide-react"
import { formatCurrency } from "@/lib/analytics-utils"
import { calcEstimate } from "@/lib/estimate-calc"
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
    defaultOpen?: boolean
    currencyChange: (field: keyof InheritanceCase) => (value: string | undefined) => void
    setFormData: React.Dispatch<React.SetStateAction<InheritanceCase>>
}

export function FinancialSection({
    formData, netRevenue, estimateNetRevenue, defaultOpen = true, currencyChange, setFormData,
}: FinancialSectionProps) {
    const breakdown = calcEstimate({
        propertyValue: formData.propertyValue || 0,
        landRosenkaCount: formData.landRosenkaCount || 0,
        landBairitsuCount: formData.landBairitsuCount || 0,
        unlistedStockCount: formData.unlistedStockCount || 0,
        heirCount: formData.heirCount || 0,
    })

    const applyToEstimate = () => {
        setFormData(prev => ({ ...prev, estimateAmount: breakdown.total }))
    }

    const applyToFee = () => {
        const rate = formData.referralFeeRate || 0
        const newReferralAmount = Math.floor(breakdown.total * (rate / 100))
        setFormData(prev => ({
            ...prev,
            feeAmount: breakdown.total,
            referralFeeAmount: newReferralAmount,
        }))
    }

    return (
        <CollapsibleSection title="金額情報" icon={Banknote} defaultOpen={defaultOpen}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label htmlFor="propertyValue">取得財産の価格</Label>
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
                        <div className="flex justify-between"><span>基本報酬（財産 × 0.8%）</span><span>{formatCurrency(breakdown.baseFee)}</span></div>
                        {breakdown.landRosenkaFee > 0 && <div className="flex justify-between"><span>加算：土地（路線価）{formData.landRosenkaCount}区分 × ¥10,000</span><span>{formatCurrency(breakdown.landRosenkaFee)}</span></div>}
                        {breakdown.landBairitsuFee > 0 && <div className="flex justify-between"><span>加算：土地（倍率）{formData.landBairitsuCount}区分 × ¥3,000</span><span>{formatCurrency(breakdown.landBairitsuFee)}</span></div>}
                        {breakdown.unlistedStockFee > 0 && <div className="flex justify-between"><span>加算：非上場株式 {formData.unlistedStockCount}社 × ¥100,000</span><span>{formatCurrency(breakdown.unlistedStockFee)}</span></div>}
                        {breakdown.heirFee > 0 && <div className="flex justify-between"><span>加算：相続人 {Math.min((formData.heirCount || 0) - 1, 4)}人 × ¥50,000</span><span>{formatCurrency(breakdown.heirFee)}</span></div>}
                        <div className="flex justify-between font-semibold border-t pt-1"><span>計算合計</span><span>{formatCurrency(breakdown.total)}</span></div>
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

                <div className="space-y-2">
                    <Label htmlFor="estimateAmount">見積額（税抜）</Label>
                    <CurrencyField
                        id="estimateAmount"
                        name="estimateAmount"
                        value={formData.estimateAmount}
                        onValueChange={currencyChange("estimateAmount")}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="feeAmount">報酬額（税抜）</Label>
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

                <div className="space-y-4 col-span-1 md:col-span-2 border rounded-lg p-4 bg-muted/30">
                    <Label className="text-base font-semibold">紹介料・担当者売上計算</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
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
                                    setFormData((prev) => ({ ...prev, referralFeeRate: rate, referralFeeAmount: newReferralAmount }))
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="referralFeeAmount">紹介料額</Label>
                            <CurrencyField
                                id="referralFeeAmount"
                                name="referralFeeAmount"
                                value={formData.referralFeeAmount || 0}
                                onValueChange={currencyChange("referralFeeAmount")}
                            />
                        </div>
                    </div>
                    <div className="pt-2 border-t mt-2 space-y-2">
                        <div className="flex justify-between items-end">
                            <Label className="text-base">担当者売上（手取り）</Label>
                            <div className="text-xl font-bold">{formatCurrency(netRevenue)}</div>
                        </div>
                        <p className="text-xs text-muted-foreground text-right">※ 報酬額（税抜） - 紹介料額</p>
                        <div className="flex justify-between items-end pt-2 border-t border-dashed">
                            <Label className="text-sm text-muted-foreground">（参考）見積ベースの手取り予測</Label>
                            <div className="text-lg font-semibold text-muted-foreground">{formatCurrency(estimateNetRevenue)}</div>
                        </div>
                        <p className="text-xs text-muted-foreground text-right">※ 見積額 × (1 - 紹介料率)</p>
                    </div>
                </div>
            </div>
        </CollapsibleSection>
    )
}
