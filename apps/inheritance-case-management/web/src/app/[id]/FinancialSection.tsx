import { Label } from "@/components/ui/Label"
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
    return (
        <CollapsibleSection title="金額情報" icon={Banknote} isOpen={isOpen} onToggle={onToggle} compact>
            <div className="grid grid-cols-1 gap-x-3 gap-y-3 sm:grid-cols-2">
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

                <FinancialEstimatePanel
                    formData={formData}
                    currencyChange={currencyChange}
                    setFormData={setFormData}
                />

                <FinancialRevenuePanel
                    formData={formData}
                    netRevenue={netRevenue}
                    estimateNetRevenue={estimateNetRevenue}
                    currencyChange={currencyChange}
                    setFormData={setFormData}
                    highlightFee={highlightFee}
                />

                <FinancialAggregationStatus formData={formData} />
            </div>
        </CollapsibleSection>
    )
}
