"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/Button"
import { StickyActionBar } from "@/components/ui/StickyActionBar"
import type { InheritanceCase, Assignee, Referrer, Person, CaseStatus } from "@/types/shared"
import { createCase, updateCase } from "@/lib/api/cases"
import { toProgressSteps, toProgressItems, toHeirInputs, toRelatedPartyInputs, toExpenses, toExpenseItems, toSpecialAdditions } from "@/lib/case-converters"
import { CASES_QUERY_KEY } from "@/hooks/use-cases"
import { getAssignees } from "@/lib/api/assignees"
import { getReferrers } from "@/lib/api/referrers"
import { getPersons } from "@/lib/api/persons"
import { useToast } from "@/components/ui/Toast"
import { Modal } from "@/components/ui/Modal"
import { ProgressEditor } from "./ProgressEditor"
import { ExpenseEditor } from "./ExpenseEditor"
import { HeirListEditor } from "./HeirListEditor"
import { RelatedPartyListEditor } from "./RelatedPartyListEditor"
import { BasicInfoSection } from "./BasicInfoSection"
import { FinancialSection } from "./FinancialSection"
import { CollapsibleSection } from "@/components/ui/CollapsibleSection"
import { DocumentExportModal } from "./DocumentExportModal"
import { AuditLogSection } from "./AuditLogSection"
import { ListChecks, Receipt, Users, Briefcase, StickyNote, FileText, ChevronsUpDown } from "lucide-react"
import { checkStatusProgressConsistency } from "@/lib/progress-utils"
import { isConflictError, CONFLICT_MESSAGE } from "@/lib/error-utils"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import { useSectionState } from "@/hooks/use-section-state"
import { COMPLETED_STATUSES } from "@/types/constants"

const SECTION_IDS = ["basicInfo", "financial", "progress", "expenses", "heirs", "relatedParties", "memo", "auditLog"] as const

export function EditCaseForm({ initialData, isCreateMode = false }: { initialData: InheritanceCase, isCreateMode?: boolean }) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const toast = useToast()
    const searchParams = useSearchParams()
    const [formData, setFormData] = useState<InheritanceCase>(initialData)
    const { isDirty, resetBaseline } = useUnsavedChanges(formData)
    const sections = useSectionState(
        [...SECTION_IDS],
        isCreateMode
            ? { basicInfo: true, financial: false, progress: false, expenses: false, heirs: false, relatedParties: false, memo: false, auditLog: false }
            : { basicInfo: false, financial: false, progress: false, expenses: false, heirs: false, relatedParties: false, memo: false, auditLog: false },
        { persist: !isCreateMode },
    )
    const [showLeaveModal, setShowLeaveModal] = useState(false)
    const [exportDocType, setExportDocType] = useState<"estimate" | "invoice" | "invoice-request" | null>(null)
    const [assignees, setAssignees] = useState<Assignee[]>([])
    const [referrers, setReferrers] = useState<Referrer[]>([])
    const [persons, setPersons] = useState<Person[]>([])
    useEffect(() => {
        const loadMasters = async () => {
            try {
                const [as, rs, ps] = await Promise.all([getAssignees(), getReferrers(), getPersons()])
                setAssignees(as)
                setReferrers(rs)
                setPersons(ps)
            } catch (e) {
                console.error("Failed to load masters", e)
            }
        }
        loadMasters()

        const saved = searchParams.get("saved")
        if (saved === "assignees" || saved === "referrers") {
            toast.success(saved === "assignees" ? "担当者設定を保存しました" : "紹介者設定を保存しました")
            const currentPath = window.location.pathname
            router.replace(currentPath)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams])

    const [isSaving, setIsSaving] = useState(false)
    const [auditRefreshKey, setAuditRefreshKey] = useState(0)
    const [pendingSuggestion, setPendingSuggestion] = useState<{ status: CaseStatus; message: string } | null>(null)

    const currencyChange = (field: keyof InheritanceCase) => (value: string | undefined) =>
        setFormData((prev) => ({ ...prev, [field]: value ? Number(value) : 0 }))

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        const numericFields = ["taxAmount", "feeAmount", "fiscalYear"]
        const fkFields = ["assigneeId", "internalReferrerId", "referrerId"]
        if (
            (
                name === "status" && (COMPLETED_STATUSES as readonly string[]).includes(value)
                || name === "caseCompletedDate" && value
            )
            && !formData.feeAmount
        ) {
            sections.open("financial")
        }
        setFormData((prev) => ({
            ...prev,
            [name]: numericFields.includes(name) ? Number(value)
                : fkFields.includes(name) ? (value ? Number(value) : null)
                : value,
        }))
    }

    // Convert normalized DB shapes to API input shapes
    const toApiPayload = () => {
        const heirs = formData.heirs ? toHeirInputs(formData.heirs) : undefined
        const relatedParties = formData.relatedParties ? toRelatedPartyInputs(formData.relatedParties) : undefined
        const progress = formData.progress ? toProgressSteps(formData.progress) : undefined
        const expenses = formData.expenses ? toExpenses(formData.expenses).filter(e => e.description) : undefined
        const specialAdditions = formData.specialAdditions
            ? toSpecialAdditions(formData.specialAdditions).filter(a => a.description.trim() !== "")
            : undefined
        return {
            deceasedName: formData.deceasedName,
            dateOfDeath: formData.dateOfDeath,
            fiscalYear: formData.fiscalYear,
            status: formData.status,
            handlingStatus: formData.handlingStatus || "対応中",
            acceptanceStatus: formData.acceptanceStatus || "未判定",
            taxAmount: formData.taxAmount,
            feeAmount: formData.feeAmount,
            estimateAmount: formData.estimateAmount,
            propertyValue: formData.propertyValue,
            referralFeeRate: formData.referralFeeRate,
            referralFeeAmount: formData.referralFeeAmount,
            estimateReferralFeeAmount: formData.estimateReferralFeeAmount,
            landRosenkaCount: formData.landRosenkaCount || 0,
            landBairitsuCount: formData.landBairitsuCount || 0,
            unlistedStockCount: formData.unlistedStockCount || 0,
            heirCount: formData.heirCount || 0,
            discountAmount: formData.discountAmount || 0,
            feeCalcSnapshot: formData.feeCalcSnapshot ?? null,
            summary: formData.summary || null,
            memo: formData.memo || null,
            caseAddedDate: formData.caseAddedDate || null,
            caseCompletedDate: formData.caseCompletedDate || null,
            assigneeId: formData.assigneeId || null,
            internalReferrerId: formData.internalReferrerId || null,
            referrerId: formData.referrerId || null,
            heirs,
            relatedParties,
            progress,
            expenses,
            specialAdditions,
        }
    }

    const doSave = async (statusOverride?: CaseStatus): Promise<boolean> => {
        let finalStatus = formData.status
        if (statusOverride) {
            finalStatus = statusOverride
            setFormData(prev => ({ ...prev, status: statusOverride }))
        }

        setIsSaving(true)
        try {
            const payload = { ...toApiPayload(), status: finalStatus }
            if (isCreateMode) {
                await createCase(payload)
                await queryClient.invalidateQueries({ queryKey: CASES_QUERY_KEY })
                toast.success("新規登録しました")
                router.push("/")
                return true
            } else {
                const updatedAt = formData.updatedAt ? new Date(formData.updatedAt).toISOString() : undefined
                const updated = await updateCase(formData.id, payload, updatedAt)
                await queryClient.invalidateQueries({ queryKey: CASES_QUERY_KEY })
                setFormData(updated)
                resetBaseline(updated)
                setAuditRefreshKey(k => k + 1)
                toast.success("保存しました")
                return true
            }
        } catch (e) {
            console.error(e)
            if (isConflictError(e)) {
                toast.error(CONFLICT_MESSAGE)
                return false
            }
            toast.error("エラーが発生しました: " + String(e))
            return false
        } finally {
            setIsSaving(false)
        }
    }

    const handleSave = async () => {
        if (!formData.deceasedName || formData.deceasedName.trim() === "") {
            toast.warning("被相続人氏名を入力してください")
            return
        }

        const invalidSpecialAddition = (formData.specialAdditions || []).some(
            (a) => !a.description.trim() && (a.amount || 0) > 0,
        )
        if (invalidSpecialAddition) {
            toast.warning("特別業務報酬額の内容を入力してください")
            return
        }

        const progress = formData.progress ? toProgressSteps(formData.progress) : []
        const { warnings, suggestion } = checkStatusProgressConsistency(formData.status, progress)
        for (const w of warnings) {
            toast.warning(w)
        }

        if (suggestion) {
            setPendingSuggestion(suggestion)
            return
        }

        await doSave()
    }

    const returnToPath = isCreateMode ? '/new' : `/${formData.id}`
    const needsConfirmedFee =
        ((COMPLETED_STATUSES as readonly string[]).includes(formData.status) || !!formData.caseCompletedDate)
        && !formData.feeAmount

    const netRevenue = useMemo(() =>
        (formData.feeAmount || 0) - (formData.referralFeeAmount || 0),
        [formData.feeAmount, formData.referralFeeAmount]
    )

    const estimateNetRevenue = useMemo(() => {
        const base = formData.estimateAmount || 0
        const referral = formData.estimateReferralFeeAmount ?? Math.floor(base * ((formData.referralFeeRate || 0) / 100))
        return base - referral
    }, [formData.estimateAmount, formData.estimateReferralFeeAmount, formData.referralFeeRate])

    return (
        <div className="space-y-3">
            {!isCreateMode && (
                <div className="mb-4 border-b pb-3">
                    <h1 className="text-xl font-bold tracking-tight">案件詳細</h1>
                    <div className="mt-1 flex justify-end">
                        <button
                            type="button"
                            onClick={sections.toggleAll}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ChevronsUpDown className="h-3.5 w-3.5" />
                            {sections.allOpen ? "すべて閉じる" : "すべて開く"}
                        </button>
                    </div>
                </div>
            )}

            <BasicInfoSection
                formData={formData}
                assignees={assignees}
                referrers={referrers}
                returnToPath={returnToPath}
                isOpen={sections.isOpen("basicInfo")}
                onToggle={() => sections.toggle("basicInfo")}
                handleChange={handleChange}
                setFormData={setFormData}
            />

            {formData.progress && (
                <CollapsibleSection title="進捗管理" icon={ListChecks} isOpen={sections.isOpen("progress")} onToggle={() => sections.toggle("progress")} badge={`${formData.progress.filter(s => s.date).length}/${formData.progress.length}`}>
                    <ProgressEditor
                        progress={toProgressSteps(formData.progress)}
                        onChange={(steps) => setFormData(prev => ({ ...prev, progress: toProgressItems(steps) }))}
                        formData={formData}
                        isCreateMode={isCreateMode}
                        handleChange={handleChange}
                        setFormData={setFormData}
                        onNeedsConfirmedFee={() => sections.open("financial")}
                    />
                </CollapsibleSection>
            )}

            <FinancialSection
                formData={formData}
                netRevenue={netRevenue}
                estimateNetRevenue={estimateNetRevenue}
                isOpen={sections.isOpen("financial")}
                onToggle={() => sections.toggle("financial")}
                currencyChange={currencyChange}
                setFormData={setFormData}
                highlightFee={needsConfirmedFee}
            />

            <CollapsibleSection title="立替金" icon={Receipt} isOpen={sections.isOpen("expenses")} onToggle={() => sections.toggle("expenses")} badge={`${(formData.expenses || []).length}件`}>
                <ExpenseEditor
                    expenses={toExpenses(formData.expenses || [])}
                    onChange={(expenses) => setFormData(prev => ({ ...prev, expenses: toExpenseItems(expenses) }))}
                />
            </CollapsibleSection>

            <CollapsibleSection title="相続人" icon={Users} isOpen={sections.isOpen("heirs")} onToggle={() => sections.toggle("heirs")} badge={`${(formData.heirs || []).length}件`}>
                <HeirListEditor
                    heirs={formData.heirs || []}
                    persons={persons}
                    onChange={(heirs) => setFormData(prev => ({ ...prev, heirs }))}
                    onPersonsChange={setPersons}
                />
            </CollapsibleSection>

            <CollapsibleSection title="関係者" icon={Briefcase} isOpen={sections.isOpen("relatedParties")} onToggle={() => sections.toggle("relatedParties")} badge={`${(formData.relatedParties || []).length}件`}>
                <RelatedPartyListEditor
                    parties={formData.relatedParties || []}
                    persons={persons}
                    onChange={(relatedParties) => setFormData(prev => ({ ...prev, relatedParties }))}
                    onPersonsChange={setPersons}
                />
            </CollapsibleSection>

            <CollapsibleSection title="メモ" icon={StickyNote} isOpen={sections.isOpen("memo")} onToggle={() => sections.toggle("memo")}>
                <textarea
                    value={formData.memo || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, memo: e.target.value }))}
                    placeholder="自由にメモを記載できます"
                    rows={4}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-y focus:outline-none focus:ring-1 focus:ring-primary min-h-[84px]"
                />
            </CollapsibleSection>

            {!isCreateMode && (
                <AuditLogSection
                    caseId={formData.id}
                    isOpen={sections.isOpen("auditLog")}
                    onToggle={() => sections.toggle("auditLog")}
                    refreshKey={auditRefreshKey}
                />
            )}

            <StickyActionBar>
                <Button
                    onClick={() => {
                        if (isDirty) {
                            setShowLeaveModal(true)
                        } else {
                            router.back()
                        }
                    }}
                    variant="ghost"
                    className="min-w-[100px]"
                    disabled={isSaving}
                >
                    戻る
                </Button>
                <div className="flex gap-2">
                    {!isCreateMode && (
                        <>
                            <Button variant="outline" onClick={() => setExportDocType("estimate")} disabled={isSaving}>
                                <FileText className="mr-1.5 h-4 w-4" />見積書
                            </Button>
                            <Button variant="outline" onClick={() => setExportDocType("invoice")} disabled={isSaving}>
                                <FileText className="mr-1.5 h-4 w-4" />請求書
                            </Button>
                            <Button variant="outline" onClick={() => setExportDocType("invoice-request")} disabled={isSaving}>
                                <FileText className="mr-1.5 h-4 w-4" />依頼票
                            </Button>
                        </>
                    )}
                    <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
                        {isSaving ? "処理中..." : isCreateMode ? "新規登録" : "変更を保存"}
                    </Button>
                </div>
            </StickyActionBar>

            <Modal
                isOpen={!!pendingSuggestion}
                onClose={() => {
                    setPendingSuggestion(null)
                    doSave()
                }}
                title="進み具合の確認"
            >
                <p className="text-sm whitespace-pre-line mb-6">{pendingSuggestion?.message}</p>
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => { setPendingSuggestion(null); doSave() }}>
                        変更しない
                    </Button>
                    <Button onClick={() => { const status = pendingSuggestion!.status; setPendingSuggestion(null); doSave(status) }}>
                        変更する
                    </Button>
                </div>
            </Modal>

            <Modal
                isOpen={showLeaveModal}
                onClose={() => setShowLeaveModal(false)}
                title="未保存の変更があります"
            >
                <p className="text-sm mb-6">変更内容が保存されていません。保存してから戻りますか？</p>
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => { setShowLeaveModal(false); router.back() }} disabled={isSaving}>
                        保存せず戻る
                    </Button>
                    <Button
                        disabled={isSaving}
                        onClick={async () => {
                            const saved = await doSave()
                            if (saved) {
                                setShowLeaveModal(false)
                                router.back()
                            }
                        }}
                    >
                        保存して戻る
                    </Button>
                </div>
            </Modal>

            {exportDocType && (
                <DocumentExportModal
                    isOpen={!!exportDocType}
                    onClose={() => setExportDocType(null)}
                    caseData={formData}
                    docType={exportDocType}
                />
            )}
        </div>
    )
}
