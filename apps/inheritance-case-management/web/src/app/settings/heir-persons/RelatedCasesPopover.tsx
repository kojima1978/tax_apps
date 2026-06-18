"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ExternalLink } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { StatusBadge } from "@/components/ui/StatusBadge"
import { formatDateWithWareki } from "@/lib/analytics-utils"
import { STATUS_STYLES } from "@/types/constants"
import type { CaseStatus } from "@/types/shared"
import { getHeirPersonRelatedCases, type RelatedCase } from "@/lib/api/heir-persons"
import { useToast } from "@/components/ui/Toast"

interface RelatedCasesPopoverProps {
    personId: number
    count: number
    personName: string
}

export function RelatedCasesPopover({ personId, count, personName }: RelatedCasesPopoverProps) {
    const router = useRouter()
    const toast = useToast()
    const [isOpen, setIsOpen] = useState(false)
    const [cases, setCases] = useState<RelatedCase[] | null>(null)
    const loading = isOpen && cases === null

    useEffect(() => {
        if (!isOpen || cases !== null) return
        let cancelled = false
        getHeirPersonRelatedCases(personId)
            .then((data) => { if (!cancelled) setCases(data) })
            .catch(() => {
                if (!cancelled) {
                    toast.error("関連案件の取得に失敗しました")
                    setCases([])
                }
            })
        return () => { cancelled = true }
    }, [isOpen, cases, personId, toast])

    if (count === 0) {
        return <span className="text-xs text-muted-foreground">0件</span>
    }

    const handleNavigate = (caseId: number) => {
        setIsOpen(false)
        router.push(`/${caseId}`)
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
                {count}件
                <ExternalLink className="h-3 w-3" />
            </button>
            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title={`${personName} の関連案件 (${count}件)`}
                panelClassName="max-w-3xl"
            >
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        読み込み中...
                    </div>
                ) : !cases || cases.length === 0 ? (
                    <p className="py-6 text-center text-sm text-muted-foreground">関連案件がありません。</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="border-b border-slate-200 text-left text-xs text-muted-foreground">
                                <tr>
                                    <th className="px-2 py-2 font-medium">被相続人</th>
                                    <th className="px-2 py-2 font-medium">死亡日</th>
                                    <th className="px-2 py-2 font-medium">続柄</th>
                                    <th className="px-2 py-2 font-medium">ステータス</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cases.map((c) => (
                                    <tr
                                        key={c.id}
                                        onClick={() => handleNavigate(c.id)}
                                        className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                                    >
                                        <td className="px-2 py-2">
                                            <div className="font-medium text-slate-900">{c.deceasedName || "(氏名未入力)"}</div>
                                            {c.deceasedNameKana && (
                                                <div className="text-[11px] text-muted-foreground">{c.deceasedNameKana}</div>
                                            )}
                                        </td>
                                        <td className="px-2 py-2 text-xs">
                                            {c.dateOfDeath ? formatDateWithWareki(c.dateOfDeath) : "-"}
                                        </td>
                                        <td className="px-2 py-2 text-xs">
                                            {c.relationship || <span className="text-muted-foreground">-</span>}
                                        </td>
                                        <td className="px-2 py-2">
                                            <StatusBadge label={c.status} style={STATUS_STYLES[c.status as CaseStatus]} />
                                            {c.isUndivided && (
                                                <span className="ml-1 text-[11px] text-muted-foreground">（未分割）</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Modal>
        </>
    )
}
