import { useState } from "react"
import { ChevronDown, ChevronRight, History, Lightbulb } from "lucide-react"
import { formatCurrency } from "@/lib/analytics-utils"
import type { FeeCalcSnapshot } from "@/lib/estimate-calc"

interface FeeSnapshotDisplayProps {
    snapshot: FeeCalcSnapshot
    currentBreakdown: {
        baseFee: number
        landRosenkaFee: number
        landBairitsuFee: number
        unlistedStockFee: number
        heirFee: number
        total: number
    }
    currentSpecialAdditionsTotal: number
    currentDiscount: number
}

export function FeeSnapshotDisplay({
    snapshot,
    currentBreakdown,
    currentSpecialAdditionsTotal,
    currentDiscount,
}: FeeSnapshotDisplayProps) {
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
