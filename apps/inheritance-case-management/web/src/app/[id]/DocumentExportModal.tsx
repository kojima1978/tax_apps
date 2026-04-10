"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Modal } from "@/components/ui/Modal"
import type { InheritanceCase } from "@/types/shared"
import { exportDocument } from "@/lib/export-excel"
import { useToast } from "@/components/ui/Toast"

type DocumentType = "estimate" | "invoice"

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
    estimate: "見積書",
    invoice: "請求書",
}

interface DocumentExportModalProps {
    isOpen: boolean
    onClose: () => void
    caseData: InheritanceCase
    docType: DocumentType
}

export function DocumentExportModal({ isOpen, onClose, caseData, docType }: DocumentExportModalProps) {
    const toast = useToast()
    const today = new Date().toISOString().split("T")[0]
    const [issueDate, setIssueDate] = useState(today)
    const [selectedContacts, setSelectedContacts] = useState<Set<number>>(new Set())
    const [customName, setCustomName] = useState("")
    const [isExporting, setIsExporting] = useState(false)

    const contacts = useMemo(() => caseData.contacts || [], [caseData.contacts])

    const toggleContact = (index: number) => {
        setSelectedContacts(prev => {
            const next = new Set(prev)
            if (next.has(index)) {
                next.delete(index)
            } else {
                next.add(index)
            }
            return next
        })
    }

    const addresseeNames = useMemo(() => {
        const names: string[] = []
        for (const idx of selectedContacts) {
            if (contacts[idx]) names.push(contacts[idx].name)
        }
        if (customName.trim()) names.push(customName.trim())
        return names
    }, [selectedContacts, customName, contacts])

    const handleExport = async () => {
        if (addresseeNames.length === 0) {
            toast.warning("宛先を1件以上選択または入力してください")
            return
        }

        setIsExporting(true)
        try {
            await exportDocument({
                caseData,
                docType,
                addresseeNames,
                issueDate,
            })
            toast.success(`${DOC_TYPE_LABELS[docType]}を出力しました`)
            onClose()
        } catch (e) {
            console.error(e)
            toast.error("出力に失敗しました: " + String(e))
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${DOC_TYPE_LABELS[docType]}の出力`}>
            <div className="space-y-4">
                {/* 発行日 */}
                <div className="space-y-2">
                    <Label htmlFor="issueDate">発行日</Label>
                    <Input
                        id="issueDate"
                        type="date"
                        value={issueDate}
                        onChange={(e) => setIssueDate(e.target.value)}
                    />
                </div>

                {/* 宛先選択 */}
                <div className="space-y-2">
                    <Label>宛先（連絡先から選択）</Label>
                    {contacts.length > 0 ? (
                        <div className="space-y-1">
                            {contacts.map((c, i) => (
                                <label key={i} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedContacts.has(i)}
                                        onChange={() => toggleContact(i)}
                                        className="rounded"
                                    />
                                    <span className="text-sm">{c.name}</span>
                                    {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                                </label>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">連絡先が登録されていません</p>
                    )}
                </div>

                {/* カスタム宛先 */}
                <div className="space-y-2">
                    <Label htmlFor="customName">宛先を直接入力</Label>
                    <Input
                        id="customName"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        placeholder="例: 山田 花子"
                    />
                </div>

                {/* プレビュー */}
                {addresseeNames.length > 0 && (
                    <div className="text-sm bg-muted/50 rounded p-2">
                        <span className="text-muted-foreground">宛先: </span>
                        <span className="font-medium">{addresseeNames.join("、")}　様</span>
                    </div>
                )}

                {/* アクション */}
                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={onClose}>
                        キャンセル
                    </Button>
                    <Button onClick={handleExport} disabled={isExporting}>
                        {isExporting ? "出力中..." : `${DOC_TYPE_LABELS[docType]}を出力`}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
