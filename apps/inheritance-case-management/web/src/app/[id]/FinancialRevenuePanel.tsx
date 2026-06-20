import { CurrencyField } from "@/components/ui/CurrencyField"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { formatCurrency } from "@/lib/analytics-utils"
import type { InheritanceCase } from "@/types/shared"
import { getReferralAmount } from "./financial-section-utils"

interface FinancialRevenuePanelProps {
    formData: InheritanceCase
    netRevenue: number
    estimateNetRevenue: number
    currencyChange: (field: keyof InheritanceCase) => (value: string | undefined) => void
    setFormData: React.Dispatch<React.SetStateAction<InheritanceCase>>
    highlightFee?: boolean
}

export function FinancialRevenuePanel({
    formData,
    netRevenue,
    estimateNetRevenue,
    currencyChange,
    setFormData,
    highlightFee,
}: FinancialRevenuePanelProps) {
    const handleReferralFeeRateChange = (value: string) => {
        const rate = value === "" ? undefined : Number(value)
        setFormData((prev) => ({
            ...prev,
            referralFeeRate: rate,
            referralFeeAmount: getReferralAmount(prev.feeAmount || 0, rate),
            estimateReferralFeeAmount: getReferralAmount(prev.estimateAmount || 0, rate),
        }))
    }

    const handleEstimateAmountChange = (value: string | undefined) => {
        const estimateAmount = value ? Number(value) : 0
        setFormData((prev) => ({
            ...prev,
            estimateAmount,
            estimateReferralFeeAmount: getReferralAmount(estimateAmount, prev.referralFeeRate),
        }))
    }

    const handleFeeAmountChange = (value: string | undefined) => {
        const feeAmount = value ? Number(value) : 0
        setFormData((prev) => ({
            ...prev,
            feeAmount,
            referralFeeAmount: getReferralAmount(feeAmount, prev.referralFeeRate),
        }))
    }

    return (
        <div className="col-span-1 space-y-2 rounded-lg border bg-muted/30 p-2.5 sm:col-span-2">
            <Label className="text-sm font-semibold">紹介料・担当者売上</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[130px_minmax(0,1fr)_minmax(0,1fr)]">
                <div className="space-y-1 rounded-md border bg-background p-2">
                    <Label htmlFor="referralFeeRate" className="text-[11px]">紹介料率 (%)</Label>
                    <Input id="referralFeeRate" name="referralFeeRate" type="number" min="0" max="100" step="0.1" value={formData.referralFeeRate?.toString() ?? ""} onChange={(e) => handleReferralFeeRateChange(e.target.value)} />
                </div>
                <div className="space-y-1.5 rounded-md border bg-background p-2">
                    <Label className="text-xs font-semibold text-muted-foreground">見積書</Label>
                    <div className="space-y-1.5">
                        <Label htmlFor="estimateAmount" className="text-xs">見積額（税抜）</Label>
                        <CurrencyField
                            id="estimateAmount"
                            name="estimateAmount"
                            value={formData.estimateAmount}
                            onValueChange={handleEstimateAmountChange}
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
                    <div className="border-t pt-1.5">
                        <div className="flex justify-between items-end">
                            <span className="text-[11px] font-medium">手取り</span>
                            <span className="text-sm font-bold">{formatCurrency(estimateNetRevenue)}</span>
                        </div>
                    </div>
                </div>
                <div className={`space-y-1.5 rounded-md border-2 bg-background p-2 transition-colors duration-500 ${highlightFee ? "border-black bg-white" : "border-primary/20"}`}>
                    <Label className="text-xs font-semibold">請求書</Label>
                    <div className="space-y-1.5">
                        <Label htmlFor="feeAmount" className="text-xs">報酬額（税抜）{highlightFee && <span className="text-black ml-1">← 入力してください</span>}</Label>
                        <CurrencyField
                            id="feeAmount"
                            name="feeAmount"
                            value={formData.feeAmount}
                            onValueChange={handleFeeAmountChange}
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
                    <div className="border-t pt-1.5">
                        <div className="flex justify-between items-end">
                            <span className="text-[11px] font-medium">手取り</span>
                            <span className="text-sm font-bold">{formatCurrency(netRevenue)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
