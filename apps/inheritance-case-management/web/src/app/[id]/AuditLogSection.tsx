"use client"

import { useState, useEffect, useMemo } from "react"
import { CollapsibleSection } from "@/components/ui/CollapsibleSection"
import { ClipboardList } from "lucide-react"
import { getCaseAuditLogs } from "@/lib/api/cases"
import { formatWareki } from "@/lib/japanese-era"
import { formatCurrency } from "@/lib/analytics-utils"
import { getAuditFieldKind, getAuditFieldLabel, type AuditFieldKind } from "@/types/audit-fields"
import type { Assignee, AuditLogEntry, Referrer } from "@/types/shared"

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    CREATE: { label: "作成", color: "text-black bg-white border-black/20" },
    UPDATE: { label: "更新", color: "text-black bg-white border-black/10" },
    DELETE: { label: "削除", color: "text-black bg-white border-black/10" },
}

const EMPTY = "—"

function referrerLabel(referrer: Referrer): string {
    const company = referrer.company?.name || ""
    return referrer.branch?.name ? `${company} / ${referrer.branch.name}` : company
}

function objectLabel(value: Record<string, unknown>): string {
    if (typeof value.name === "string" && value.name) return value.name
    const company = value.company as { name?: string } | undefined
    const branch = value.branch as { name?: string } | undefined
    if (company?.name) return branch?.name ? `${company.name} / ${branch.name}` : company.name
    return "(内容あり)"
}

/**
 * 変更履歴の値を人間が読める形にする。
 * 以前はすべて `String(value)` に落としていたため、担当者が内部ID、遺産未分割が
 * `true`、日付が ISO 文字列、子レコードが `[object Object]` のまま出ていた。
 */
function formatValue(
    value: unknown,
    kind: AuditFieldKind,
    masters: { assigneeNames: Map<number, string>; referrerNames: Map<number, string> },
): string {
    if (value === null || value === undefined || value === "") return EMPTY

    // 旧形式の履歴にはリレーションが生のオブジェクトのまま残っている。
    // 今は記録しないが、過去分を `[object Object]` のまま出さないようにここで吸収する。
    if (Array.isArray(value)) return `${value.length}件`
    if (typeof value === "object") return objectLabel(value as Record<string, unknown>)

    switch (kind) {
        case "boolean":
            return value ? "あり" : "なし"
        case "date": {
            const iso = String(value).slice(0, 10)
            return formatWareki(iso) || iso
        }
        case "currency":
            return typeof value === "number" ? formatCurrency(value) : String(value)
        case "percent":
            return `${value}%`
        case "count":
            return String(value)
        case "relation":
            return typeof value === "number" ? `${value}件` : EMPTY
        case "assignee": {
            const id = Number(value)
            return masters.assigneeNames.get(id) || `ID:${id}`
        }
        case "referrer": {
            const id = Number(value)
            return masters.referrerNames.get(id) || `ID:${id}`
        }
        default:
            return typeof value === "number" ? value.toLocaleString("ja-JP") : String(value)
    }
}

function formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString("ja-JP", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
    })
}

interface AuditLogSectionProps {
    caseId: number
    assignees: Assignee[]
    referrers: Referrer[]
    isOpen?: boolean
    onToggle?: () => void
    refreshKey?: number
}

export function AuditLogSection({ caseId, assignees, referrers, isOpen, onToggle, refreshKey }: AuditLogSectionProps) {
    const [logs, setLogs] = useState<AuditLogEntry[]>([])
    const [hasLoaded, setHasLoaded] = useState(false)
    const isLoading = !!isOpen && !hasLoaded

    const masters = useMemo(() => ({
        assigneeNames: new Map(assignees.map((a) => [a.id, a.name])),
        referrerNames: new Map(referrers.map((r) => [r.id, referrerLabel(r)])),
    }), [assignees, referrers])

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
                                    <span className={`px-1.5 py-0.5 rounded border text-[11px] font-medium ${actionInfo.color}`}>
                                        {actionInfo.label}
                                    </span>
                                    <span className="text-muted-foreground">{formatDateTime(log.changedAt)}</span>
                                </div>
                                {log.changes && log.changes.length > 0 && (
                                    <div className="space-y-0.5 mt-1">
                                        {log.changes.map((c, i) => {
                                            const kind = getAuditFieldKind(c.field)
                                            const oldText = formatValue(c.old, kind, masters)
                                            const newText = formatValue(c.new, kind, masters)
                                            // 子レコードは件数しか持たないので、件数が変わらない場合は
                                            // 「→」を出さずに「内容を変更」と書く（3件 → 3件 を避ける）
                                            const sameCount = kind === "relation" && oldText === newText
                                            return (
                                                <div key={i} className="flex items-baseline gap-1 text-slate-600">
                                                    <span className="font-medium text-slate-700 shrink-0">{getAuditFieldLabel(c.field)}</span>
                                                    {sameCount ? (
                                                        <span className="text-gray-800">内容を変更（{newText}）</span>
                                                    ) : (
                                                        <>
                                                            <span className="text-gray-500 line-through truncate max-w-[120px]" title={oldText}>{oldText}</span>
                                                            <span className="text-muted-foreground">→</span>
                                                            <span className="text-gray-800 truncate max-w-[120px]" title={newText}>{newText}</span>
                                                        </>
                                                    )}
                                                </div>
                                            )
                                        })}
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
