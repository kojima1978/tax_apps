"use client"

import { useState, useEffect } from "react"
import { CollapsibleSection } from "@/components/ui/CollapsibleSection"
import { ClipboardList } from "lucide-react"
import { getCaseAuditLogs } from "@/lib/api/cases"
import type { AuditLogEntry } from "@/types/shared"

const FIELD_LABELS: Record<string, string> = {
    deceasedName: "被相続人氏名",
    dateOfDeath: "死亡日",
    status: "ステータス",
    isUndivided: "遺産未分割",
    taxAmount: "申告納税額",
    feeAmount: "報酬額",
    estimateAmount: "見積額",
    propertyValue: "遺産総額",
    referralFeeRate: "紹介料率",
    referralFeeAmount: "紹介料額",
    estimateReferralFeeAmount: "見積紹介料額",
    landRosenkaCount: "土地数（路線価）",
    landBairitsuCount: "土地数（倍率）",
    unlistedStockCount: "非上場株式数",
    heirCount: "相続人数",
    discountAmount: "値引額",
    summary: "特記事項",
    memo: "メモ",
    caseAddedDate: "受託日",
    caseCompletedDate: "申告日",
    billedDate: "請求日",
    paidDate: "入金日",
    assigneeId: "担当者",
    internalReferrerId: "社内紹介者",
    referrerId: "紹介者",
    fiscalYear: "年度",
}

function getFieldLabel(field: string): string {
    return FIELD_LABELS[field] || field
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    CREATE: { label: "作成", color: "text-black bg-white border-black/20" },
    UPDATE: { label: "更新", color: "text-black bg-white border-black/10" },
    DELETE: { label: "削除", color: "text-black bg-white border-black/10" },
}

function formatValue(value: unknown): string {
    if (value === null || value === undefined) return "—"
    if (typeof value === "number") {
        return value.toLocaleString("ja-JP")
    }
    return String(value)
}

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString("ja-JP", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
    })
}

interface AuditLogSectionProps {
    caseId: number
    isOpen?: boolean
    onToggle?: () => void
    refreshKey?: number
}

export function AuditLogSection({ caseId, isOpen, onToggle, refreshKey }: AuditLogSectionProps) {
    const [logs, setLogs] = useState<AuditLogEntry[]>([])
    const [hasLoaded, setHasLoaded] = useState(false)
    const isLoading = !!isOpen && !hasLoaded

    useEffect(() => {
        if (!isOpen || hasLoaded) return
        let cancelled = false
        getCaseAuditLogs(caseId)
            .then((data) => { if (!cancelled) setLogs(data) })
            .catch(console.error)
            .finally(() => { if (!cancelled) setHasLoaded(true) })
        return () => { cancelled = true }
    }, [isOpen, caseId, hasLoaded])

    useEffect(() => {
        if (refreshKey && hasLoaded) {
            getCaseAuditLogs(caseId).then(setLogs).catch(console.error)
        }
    }, [refreshKey, caseId, hasLoaded])

    return (
        <CollapsibleSection title="変更履歴" icon={ClipboardList} isOpen={isOpen} onToggle={onToggle} badge={hasLoaded ? `${logs.length}件` : undefined} compact>
            {isLoading ? (
                <div className="text-sm text-muted-foreground py-4 text-center">読み込み中...</div>
            ) : logs.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4 text-center">変更履歴はありません</div>
            ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {logs.map((log) => {
                        const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: "text-gray-700 bg-gray-50 border-gray-200" }
                        return (
                            <div key={log.id} className="border rounded-lg px-3 py-2 text-xs">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${actionInfo.color}`}>
                                        {actionInfo.label}
                                    </span>
                                    <span className="text-muted-foreground">{formatDateTime(log.changedAt)}</span>
                                </div>
                                {log.changes && log.changes.length > 0 && (
                                    <div className="space-y-0.5 mt-1">
                                        {log.changes.map((c, i) => (
                                            <div key={i} className="flex items-baseline gap-1 text-slate-600">
                                                <span className="font-medium text-slate-700 shrink-0">{getFieldLabel(c.field)}</span>
                                                <span className="text-gray-500 line-through truncate max-w-[120px]" title={formatValue(c.old)}>{formatValue(c.old)}</span>
                                                <span className="text-muted-foreground">→</span>
                                                <span className="text-gray-800 truncate max-w-[120px]" title={formatValue(c.new)}>{formatValue(c.new)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}
        </CollapsibleSection>
    )
}
