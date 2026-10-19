import { Label } from "@/components/ui/Label"
import { useEffect, useState } from "react"
import { formatCurrency } from "@/lib/analytics-utils"
import { CurrencyField } from "@/components/ui/CurrencyField"
import { CollapsibleSection } from "@/components/ui/CollapsibleSection"
import { Banknote } from "lucide-react"
import type { InheritanceCase } from "@/types/shared"
import { FinancialAggregationStatus } from "./FinancialAggregationStatus"
import { FinancialEstimatePanel } from "./FinancialEstimatePanel"
import { FinancialRevenuePanel } from "./FinancialRevenuePanel"

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
    const [tab, setSelectedTab] = useState<"calculation" | "estimate" | "invoice">(highlightFee ? "invoice" : "calculation")
    useEffect(() => {
        const onField = () => setSelectedTab("invoice")
        window.addEventListener("itcm:focus-fee", onField)
        return () => window.removeEventListener("itcm:focus-fee", onField)
    }, [])
    const tabs = [{ id: "calculation", label: "報酬計算" }, { id: "estimate", label: "見積" }, { id: "invoice", label: "請求" }] as const
    const amount = tab === "estimate" ? formData.estimateAmount : formData.feeAmount
    const referral = tab === "estimate" ? formData.estimateReferralFeeAmount : formData.referralFeeAmount
    return (
        <CollapsibleSection title="金額情報" icon={Banknote} isOpen={isOpen} onToggle={onToggle} compact>
            <div className="max-w-3xl">
            <dl className="mb-3 grid grid-cols-1 gap-2 rounded-lg bg-blue-50 p-3 sm:grid-cols-3" aria-label="主要な金額">
                {[{ label: tab === "estimate" ? "見積額（税抜）" : "報酬額（税抜）", value: amount }, { label: "紹介料", value: referral }, { label: "手取り", value: tab === "estimate" ? estimateNetRevenue : netRevenue }].map(item => <div key={item.label} className="flex items-center justify-between gap-3 sm:block"><dt className="text-xs text-slate-600">{item.label}</dt><dd className="text-right text-lg font-bold tabular-nums text-blue-900">{formatCurrency(item.value || 0)}</dd></div>)}
            </dl>
            <div role="tablist" aria-label="金額情報の区分" className="mb-3 flex gap-2">
                {tabs.map((item, index) => <button key={item.id} type="button" id={`financial-tab-${item.id}`} role="tab" aria-selected={tab === item.id} aria-controls={`financial-panel-${item.id}`} tabIndex={tab === item.id ? 0 : -1} className={`min-h-11 flex-1 rounded-md border px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring ${tab === item.id ? "border-blue-700 bg-blue-700 text-white" : "bg-white hover:bg-blue-50"}`} onClick={() => setSelectedTab(item.id)} onKeyDown={event => {
                    const next = event.key === "ArrowRight" ? (index + 1) % tabs.length : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null
                    if (next === null) return
                    event.preventDefault(); setSelectedTab(tabs[next].id); document.getElementById(`financial-tab-${tabs[next].id}`)?.focus()
                }}>{item.label}</button>)}
            </div>
            <div id="financial-panel-calculation" role="tabpanel" aria-labelledby="financial-tab-calculation" hidden={tab !== "calculation"}>
            <div className="space-y-4">
            <div className="rounded-lg border bg-white p-3">
            <div className="flex flex-wrap gap-x-6 gap-y-3">
                <div className="w-56 max-w-full space-y-1.5">
                    <Label htmlFor="propertyValue" className="text-xs">
                        遺産総額
                    </Label>
                    <CurrencyField
                        id="propertyValue"
                        name="propertyValue"
                        value={formData.propertyValue}
                        onValueChange={currencyChange("propertyValue")}
                        aria-describedby="property-value-help"
                    />
                </div>

                <div className="w-56 max-w-full space-y-1.5">
                    <Label htmlFor="taxAmount" className="text-xs">申告納税額</Label>
                    <CurrencyField
                        id="taxAmount"
                        name="taxAmount"
                        value={formData.taxAmount}
                        onValueChange={currencyChange("taxAmount")}
                    />
                </div>
            </div>
            <p id="property-value-help" className="mt-2 text-xs leading-relaxed text-slate-500">遺産総額：生前贈与加算額を含み、債務控除・非課税・各種特例の適用前</p>
            </div>

                <FinancialEstimatePanel
                    formData={formData}
                    currencyChange={currencyChange}
                    setFormData={setFormData}
                />

            </div>
            </div>
            {tab !== "calculation" && <div id={`financial-panel-${tab}`} role="tabpanel" aria-labelledby={`financial-tab-${tab}`}>
                <p className="mb-2 text-sm text-muted-foreground">金額は手入力で調整できます。紹介料は率から自動計算され、直接変更すると「手動」になります。</p>
                <FinancialRevenuePanel
                    mode={tab}
                    formData={formData}
                    netRevenue={netRevenue}
                    estimateNetRevenue={estimateNetRevenue}
                    setFormData={setFormData}
                    highlightFee={highlightFee}
                />
            </div>}
            <div className="mt-3"><FinancialAggregationStatus formData={formData} /></div>
            </div>
        </CollapsibleSection>
    )
}
