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
    mode?: "estimate" | "invoice"
}

export function FinancialRevenuePanel({
    formData,
    netRevenue,
    estimateNetRevenue,
    setFormData,
    highlightFee,
    mode,
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
        <div className="max-w-xl space-y-3 rounded-lg border bg-white p-3">
            <Label className="text-sm font-semibold">紹介料・担当者売上</Label>
            <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3 border-b pb-3">
                    <Label htmlFor="referralFeeRate" className="text-[11px]">紹介料率 (%)</Label>
                    <Input id="referralFeeRate" name="referralFeeRate" type="number" min="0" max="100" step="0.1" inputMode="decimal" className="w-24 text-right tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" value={formData.referralFeeRate?.toString() ?? ""} onChange={(e) => handleReferralFeeRateChange(e.target.value)} />
                </div>
                {mode !== "invoice" && <div className="space-y-3">
                    <Label className="text-xs font-semibold text-muted-foreground">見積書</Label>
                    <div className="grid grid-cols-1 items-center gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_14rem]">
                        <Label htmlFor="estimateAmount" className="text-xs">見積額（税抜）</Label>
                        <CurrencyField
                            id="estimateAmount"
                            className="w-56 max-w-full"
                            name="estimateAmount"
                            value={formData.estimateAmount}
                            onValueChange={handleEstimateAmountChange}
                        />
                    </div>
                    <div className="grid grid-cols-1 items-center gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_14rem]">
                        <div className="flex flex-wrap items-center gap-2">
                            <Label htmlFor="estimateReferralFeeAmount" className="text-xs">
                                紹介料額
                                <span className="ml-1 text-[11px] text-muted-foreground">
                                    {formData.isEstimateReferralFeeManual ? "手動" : "自動"}
                                </span>
                            </Label>
                            {formData.isEstimateReferralFeeManual && (
                                <Button type="button" variant="ghost" className="h-6 px-1.5 text-[11px]" onClick={() => recalculateReferralAmount("estimate")}>
                                    率から再計算
                                </Button>
                            )}
                        </div>
                        <CurrencyField
                            id="estimateReferralFeeAmount"
                            className="w-56 max-w-full"
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
                </div>}
                {mode !== "estimate" && <div className={`space-y-3 rounded-md transition-colors duration-200 ${highlightFee ? "bg-amber-50 p-2 ring-1 ring-amber-300" : ""}`}>
                    <Label className="text-xs font-semibold">請求書</Label>
                    <div className="grid grid-cols-1 items-center gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_14rem]">
                        <Label htmlFor="feeAmount" className="text-xs">報酬額（税抜）{highlightFee && <span className="text-black ml-1">← 入力してください</span>}</Label>
                        <CurrencyField
                            id="feeAmount"
                            className="w-56 max-w-full"
                            name="feeAmount"
                            value={formData.feeAmount}
                            onValueChange={handleFeeAmountChange}
                        />
                    </div>
                    <div className="grid grid-cols-1 items-center gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_14rem]">
                        <div className="flex flex-wrap items-center gap-2">
                            <Label htmlFor="referralFeeAmount" className="text-xs">
                                紹介料額
                                <span className="ml-1 text-[11px] text-muted-foreground">
                                    {formData.isReferralFeeManual ? "手動" : "自動"}
                                </span>
                            </Label>
                            {formData.isReferralFeeManual && (
                                <Button type="button" variant="ghost" className="h-6 px-1.5 text-[11px]" onClick={() => recalculateReferralAmount("fee")}>
                                    率から再計算
                                </Button>
                            )}
                        </div>
                        <CurrencyField
                            id="referralFeeAmount"
                            className="w-56 max-w-full"
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
                </div>}
            </div>
        </div>
    )
}
