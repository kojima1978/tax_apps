"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Modal } from "@/components/ui/Modal"
import type { InheritanceCase } from "@/types/shared"
import { exportDocument } from "@/lib/export-excel"
import { todayIsoDate } from "@/lib/date-utils"
import { useToast } from "@/components/ui/Toast"
import { DOCUMENT_TYPE_LABELS, type DocumentType } from "@/lib/document-types"
import { formatCurrency } from "@/lib/analytics-utils"

type AddresseeMode = "heirs-respective" | "selected-heirs" | "custom"
const MAX_ESTIMATE_INVOICE_ADDRESSEES = 3

interface DocumentExportModalProps {
    isOpen: boolean
    onClose: () => void
    caseData: InheritanceCase
    docType: DocumentType
    hasUnsavedChanges?: boolean
    onSave?: () => Promise<boolean>
}

export function DocumentExportModal({ isOpen, onClose, caseData, docType, hasUnsavedChanges = false, onSave }: DocumentExportModalProps) {
    const toast = useToast()
    const today = todayIsoDate()
    const supportsCollectiveAddressee = docType === "estimate" || docType === "invoice"
    const [issueDate, setIssueDate] = useState(today)
    const [addresseeMode, setAddresseeMode] = useState<AddresseeMode>(
        supportsCollectiveAddressee ? "heirs-respective" : "selected-heirs",
    )
    const [selectedHeirs, setSelectedHeirs] = useState<Set<number>>(new Set())
    const [customName, setCustomName] = useState("")
    const [isExporting, setIsExporting] = useState(false)
    const [saveFirst, setSaveFirst] = useState(false)
    const [hasConfirmed, setHasConfirmed] = useState(false)
    const expensesTotal = (caseData.expenses || []).reduce((sum, item) => sum + (item.amount || 0), 0)

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
                if (!supportsCollectiveAddressee) { next.clear(); setCustomName("") }
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
            return customName.trim() ? [customName.trim()] : selectedHeirNames.slice(0, 1)
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
            return addresseeNames[0] || ""
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
        if (!issueDate) { toast.warning("発行日を入力してください"); return }
        if (!hasConfirmed) { toast.warning("出力内容の確認にチェックしてください"); return }
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
            if (hasUnsavedChanges && saveFirst && onSave && !(await onSave())) return
            await exportDocument({
                caseData,
                docType,
                addresseeNames,
                issueDate,
            })
            toast.success(`${DOCUMENT_TYPE_LABELS[docType]}を出力しました`)
            onClose()
        } catch (e) {
            console.error(e)
            toast.error("出力に失敗しました: " + String(e))
        } finally {
            setIsExporting(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={() => { if (!isExporting) onClose() }} title={`${DOCUMENT_TYPE_LABELS[docType]}の出力`} panelClassName="case-workspace max-w-2xl">
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
                            {heirs.length > 1 && supportsCollectiveAddressee && (
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
                        onChange={(e) => { setCustomName(e.target.value); if (!supportsCollectiveAddressee) setSelectedHeirs(new Set()) }}
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

                <section aria-label="帳票の出力内容確認" className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <h3 className="font-semibold">出力内容の確認</h3>
                    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
                        <dt>被相続人</dt><dd className="break-words font-medium">{caseData.deceasedName}</dd>
                        <dt>発行日</dt><dd>{issueDate || "未入力"}</dd>
                        <dt>宛先</dt><dd className="whitespace-pre-line break-words">{addresseePreview || "未選択"}</dd>
                        {docType === "invoice-request" ? <><dt>報酬額（税抜）</dt><dd className="font-semibold tabular-nums">{formatCurrency(caseData.feeAmount || 0)}</dd></> : <>
                            <dt>遺産総額</dt><dd>{formatCurrency(caseData.propertyValue || 0)}</dd>
                            <dt>加算対象</dt><dd>土地（路線価）{caseData.landRosenkaCount || 0}区分・土地（倍率）{caseData.landBairitsuCount || 0}区分・非上場株式{caseData.unlistedStockCount || 0}社・相続人{caseData.feeCalculationHeirCount || 0}名</dd>
                            <dt>特別業務報酬額</dt><dd>{(caseData.specialAdditions || []).slice(0, 2).map(item => `${item.description || "内容未入力"}：${formatCurrency(item.amount || 0)}`).join("、") || "なし"}</dd>
                            <dt>値引額</dt><dd>{formatCurrency(Math.abs(caseData.discountAmount || 0))}</dd>
                        </>}
                        {docType !== "estimate" && <><dt>立替金</dt><dd>{formatCurrency(expensesTotal)}（{caseData.expenses?.length || 0}件）</dd></>}
                        {docType === "invoice-request" && <><dt>紹介料</dt><dd>{formatCurrency(caseData.referralFeeAmount || 0)}</dd></>}
                    </dl>
                    <p className="text-xs text-slate-600">{docType === "invoice-request" ? "依頼票は入力済みの報酬額・紹介料を出力します。宛先は1件です。" : "見積書・請求書は上記の入力値を使い、Excelテンプレートの計算式で報酬・消費税・合計を計算します。手入力した見積額・報酬額は使用しません。最終金額はExcelの帳票で確認してください。"}</p>
                </section>
                <div role="status" className={`rounded-md border p-3 text-sm ${hasUnsavedChanges ? "border-amber-200 bg-amber-50 text-amber-900" : "bg-slate-50"}`}>
                    {hasUnsavedChanges ? "未保存の変更を含む現在の入力内容を出力します。" : "保存済みの内容を出力します。"}
                    {hasUnsavedChanges && onSave && <label className="mt-2 flex min-h-11 items-center gap-2"><input type="checkbox" checked={saveFirst} onChange={event => setSaveFirst(event.target.checked)} />先に案件を保存してから出力する</label>}
                </div>
                <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={hasConfirmed} onChange={event => setHasConfirmed(event.target.checked)} />宛名・発行日・金額を確認しました</label>
                {/* アクション */}
                <div className="flex justify-end gap-3 pt-2">
                    <Button variant="ghost" onClick={onClose} disabled={isExporting}>
                        キャンセル
                    </Button>
                    <Button onClick={handleExport} disabled={isExporting || !hasConfirmed || !issueDate || addresseeNames.length === 0}>
                        {isExporting ? "出力中..." : `${DOCUMENT_TYPE_LABELS[docType]}を出力`}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
