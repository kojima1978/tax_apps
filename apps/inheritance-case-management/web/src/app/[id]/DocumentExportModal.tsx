"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Modal } from "@/components/ui/Modal"
import type { InheritanceCase } from "@/types/shared"
import { exportDocument } from "@/lib/export-excel"
import { useToast } from "@/components/ui/Toast"

type DocumentType = "estimate" | "invoice" | "invoice-request"
type AddresseeMode = "heirs-respective" | "selected-heirs" | "custom"
const MAX_ESTIMATE_INVOICE_ADDRESSEES = 3

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
    estimate: "見積書",
    invoice: "請求書",
    "invoice-request": "請求書発行依頼票",
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
    const supportsCollectiveAddressee = docType === "estimate" || docType === "invoice"
    const [issueDate, setIssueDate] = useState(today)
    const [addresseeMode, setAddresseeMode] = useState<AddresseeMode>(
        supportsCollectiveAddressee ? "heirs-respective" : "selected-heirs",
    )
    const [selectedHeirs, setSelectedHeirs] = useState<Set<number>>(new Set())
    const [customName, setCustomName] = useState("")
    const [isExporting, setIsExporting] = useState(false)

    const heirs = useMemo(() => caseData.heirs || [], [caseData.heirs])
    const selectedHeirNames = useMemo(
        () => heirs.flatMap((h, i) => selectedHeirs.has(i) ? [h.person.name] : []),
        [heirs, selectedHeirs],
    )

    const toggleHeir = (index: number) => {
        setSelectedHeirs(prev => {
            const next = new Set(prev)
            if (next.has(index)) {
                next.delete(index)
            } else {
                if (supportsCollectiveAddressee && next.size >= MAX_ESTIMATE_INVOICE_ADDRESSEES) {
                    toast.warning(`宛先は最大${MAX_ESTIMATE_INVOICE_ADDRESSEES}人まで選択できます`)
                    return prev
                }
                next.add(index)
            }
            return next
        })
    }

    const addresseeNames = useMemo(() => {
        if (!supportsCollectiveAddressee) {
            const names = [...selectedHeirNames]
            if (customName.trim()) names.push(customName.trim())
            return names
        }
        if (supportsCollectiveAddressee && addresseeMode === "heirs-respective") {
            return ["相続人各位"]
        }
        if (addresseeMode === "selected-heirs") {
            return selectedHeirNames
        }
        const trimmed = customName.trim()
        return trimmed ? [trimmed] : []
    }, [supportsCollectiveAddressee, addresseeMode, selectedHeirNames, customName])

    const addresseePreview = useMemo(() => {
        if (!supportsCollectiveAddressee) {
            return addresseeNames.length > 0 ? `${addresseeNames.join("、")}　様` : ""
        }
        if (supportsCollectiveAddressee && addresseeMode === "heirs-respective") {
            return "相続人各位"
        }
        if (addresseeMode === "selected-heirs") {
            return selectedHeirNames.map(name => `${name} 様`).join("\n")
        }
        const trimmed = customName.trim()
        if (!trimmed) return ""
        return /(?:様|御中|各位)$/.test(trimmed) ? trimmed : `${trimmed} 様`
    }, [supportsCollectiveAddressee, addresseeMode, selectedHeirNames, customName, addresseeNames])

    const handleExport = async () => {
        if (addresseeNames.length === 0) {
            toast.warning("宛先を1件以上選択または入力してください")
            return
        }
        if (supportsCollectiveAddressee && addresseeNames.length > MAX_ESTIMATE_INVOICE_ADDRESSEES) {
            toast.warning(`宛先は最大${MAX_ESTIMATE_INVOICE_ADDRESSEES}人まで選択できます`)
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

                {supportsCollectiveAddressee && (
                    <div className="space-y-2">
                        <Label>宛先区分</Label>
                        <div className="grid gap-2 sm:grid-cols-3">
                            <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                                <input
                                    type="radio"
                                    name="addresseeMode"
                                    value="heirs-respective"
                                    checked={addresseeMode === "heirs-respective"}
                                    onChange={() => setAddresseeMode("heirs-respective")}
                                />
                                <span>相続人各位</span>
                            </label>
                            <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                                <input
                                    type="radio"
                                    name="addresseeMode"
                                    value="selected-heirs"
                                    checked={addresseeMode === "selected-heirs"}
                                    onChange={() => setAddresseeMode("selected-heirs")}
                                />
                                <span>相続人を選択</span>
                            </label>
                            <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted">
                                <input
                                    type="radio"
                                    name="addresseeMode"
                                    value="custom"
                                    checked={addresseeMode === "custom"}
                                    onChange={() => setAddresseeMode("custom")}
                                />
                                <span>直接入力</span>
                            </label>
                        </div>
                    </div>
                )}

                {/* 宛先選択 */}
                <div className={!supportsCollectiveAddressee || addresseeMode === "selected-heirs" ? "space-y-2" : "hidden"}>
                    <Label>
                        宛先（相続人から選択{supportsCollectiveAddressee ? `・最大${MAX_ESTIMATE_INVOICE_ADDRESSEES}人` : ""}）
                    </Label>
                    {supportsCollectiveAddressee && (
                        <p className="text-xs text-muted-foreground">複数宛先は最大3人まで、帳票上は1人ずつ別行に出力します。</p>
                    )}
                    {heirs.length > 0 ? (
                        <div className="space-y-1">
                            {heirs.length > 1 && (
                                <div className="flex gap-2 pb-1">
                                    <button
                                        type="button"
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() => setSelectedHeirs(new Set(heirs.slice(0, supportsCollectiveAddressee ? MAX_ESTIMATE_INVOICE_ADDRESSEES : heirs.length).map((_, i) => i)))}
                                    >
                                        {supportsCollectiveAddressee ? "先頭3人を選択" : "全選択"}
                                    </button>
                                    <button
                                        type="button"
                                        className="text-xs text-muted-foreground hover:text-foreground"
                                        onClick={() => setSelectedHeirs(new Set())}
                                    >
                                        クリア
                                    </button>
                                </div>
                            )}
                            {heirs.map((h, i) => {
                                const isSelectionDisabled = supportsCollectiveAddressee
                                    && !selectedHeirs.has(i)
                                    && selectedHeirs.size >= MAX_ESTIMATE_INVOICE_ADDRESSEES
                                return (
                                    <label
                                        key={i}
                                        className={`flex items-center gap-2 px-2 py-1.5 rounded ${isSelectionDisabled ? "cursor-not-allowed opacity-50" : "hover:bg-muted cursor-pointer"}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedHeirs.has(i)}
                                            disabled={isSelectionDisabled}
                                            onChange={() => toggleHeir(i)}
                                            className="rounded"
                                        />
                                        <span className="text-sm">{h.person.name}</span>
                                        {h.relationship && <span className="text-xs text-muted-foreground">（{h.relationship}）</span>}
                                        {h.person.phone && <span className="text-xs text-muted-foreground">{h.person.phone}</span>}
                                    </label>
                                )
                            })}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">相続人が登録されていません</p>
                    )}
                </div>

                {/* カスタム宛先 */}
                <div className={!supportsCollectiveAddressee || addresseeMode === "custom" ? "space-y-2" : "hidden"}>
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
                        <span className="font-medium whitespace-pre-line">{addresseePreview}</span>
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
