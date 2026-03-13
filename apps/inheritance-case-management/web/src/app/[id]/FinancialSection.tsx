import { Label } from "@/components/ui/Label"
import { Input } from "@/components/ui/Input"
import { CurrencyField } from "@/components/ui/CurrencyField"
import { CollapsibleSection } from "@/components/ui/CollapsibleSection"
import { Banknote } from "lucide-react"
import { formatCurrency } from "@/lib/analytics-utils"
import type { InheritanceCase } from "@/types/shared"

const SIMPLE_CURRENCY_FIELDS: { key: keyof InheritanceCase; label: string }[] = [
    { key: "propertyValue", label: "取得財産の価格" },
    { key: "taxAmount", label: "申告納税額" },
    { key: "estimateAmount", label: "見積額（税抜）" },
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
    return (
        <CollapsibleSection title="金額情報" icon={Banknote} defaultOpen={defaultOpen}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {SIMPLE_CURRENCY_FIELDS.map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                        <Label htmlFor={key}>{label}</Label>
                        <CurrencyField
                            id={key}
                            name={key}
                            value={formData[key] as number | undefined}
                            onValueChange={currencyChange(key)}
                        />
                    </div>
                ))}

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
