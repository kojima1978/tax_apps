import { CurrencyField } from "@/components/ui/CurrencyField"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { formatCurrency } from "@/lib/analytics-utils"
import type { InheritanceCase } from "@/types/shared"
import { getReferralAmount } from "./financial-section-utils"

interface FinancialRevenuePanelProps {
    formData: InheritanceCase
    netRevenue: number
    estimateNetRevenue: number
    setFormData: React.Dispatch<React.SetStateAction<InheritanceCase>>
    highlightFee?: boolean
}

export function FinancialRevenuePanel({
    formData,
    netRevenue,
    estimateNetRevenue,
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
            isReferralFeeManual: false,
            isEstimateReferralFeeManual: false,
        }))
    }

    const handleEstimateAmountChange = (value: string | undefined) => {
        const estimateAmount = value ? Number(value) : 0
        setFormData((prev) => ({
            ...prev,
            estimateAmount,
            estimateReferralFeeAmount: prev.isEstimateReferralFeeManual
                ? prev.estimateReferralFeeAmount
                : getReferralAmount(estimateAmount, prev.referralFeeRate),
        }))
    }

    const handleFeeAmountChange = (value: string | undefined) => {
        const feeAmount = value ? Number(value) : 0
        setFormData((prev) => ({
            ...prev,
            feeAmount,
            referralFeeAmount: prev.isReferralFeeManual
                ? prev.referralFeeAmount
                : getReferralAmount(feeAmount, prev.referralFeeRate),
        }))
    }

    const handleReferralAmountChange = (kind: "estimate" | "fee", value: string | undefined) => {
        const amount = value ? Number(value) : 0
        setFormData(prev => kind === "estimate"
            ? { ...prev, estimateReferralFeeAmount: amount, isEstimateReferralFeeManual: true }
            : { ...prev, referralFeeAmount: amount, isReferralFeeManual: true })
    }

    const recalculateReferralAmount = (kind: "estimate" | "fee") => {
        setFormData(prev => kind === "estimate"
            ? {
                ...prev,
                estimateReferralFeeAmount: getReferralAmount(prev.estimateAmount || 0, prev.referralFeeRate),
                isEstimateReferralFeeManual: false,
            }
            : {
                ...prev,
                referralFeeAmount: getReferralAmount(prev.feeAmount || 0, prev.referralFeeRate),
                isReferralFeeManual: false,
            })
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
                        <div className="flex items-center justify-between gap-2">
                            <Label htmlFor="estimateReferralFeeAmount" className="text-xs">
                                紹介料額
                                <span className="ml-1 text-[9px] text-muted-foreground">
                                    {formData.isEstimateReferralFeeManual ? "手動" : "自動"}
                                </span>
                            </Label>
                            {formData.isEstimateReferralFeeManual && (
                                <Button type="button" variant="ghost" className="h-6 px-1.5 text-[9px]" onClick={() => recalculateReferralAmount("estimate")}>
                                    率から再計算
                                </Button>
                            )}
                        </div>
                        <CurrencyField
                            id="estimateReferralFeeAmount"
                            name="estimateReferralFeeAmount"
                            value={formData.estimateReferralFeeAmount || 0}
                            onValueChange={(value) => handleReferralAmountChange("estimate", value)}
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
                        <div className="flex items-center justify-between gap-2">
                            <Label htmlFor="referralFeeAmount" className="text-xs">
                                紹介料額
                                <span className="ml-1 text-[9px] text-muted-foreground">
                                    {formData.isReferralFeeManual ? "手動" : "自動"}
                                </span>
                            </Label>
                            {formData.isReferralFeeManual && (
                                <Button type="button" variant="ghost" className="h-6 px-1.5 text-[9px]" onClick={() => recalculateReferralAmount("fee")}>
                                    率から再計算
                                </Button>
                            )}
                        </div>
                        <CurrencyField
                            id="referralFeeAmount"
                            name="referralFeeAmount"
                            value={formData.referralFeeAmount || 0}
                            onValueChange={(value) => handleReferralAmountChange("fee", value)}
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
