"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/Button"
import { StickyActionBar } from "@/components/ui/StickyActionBar"
import type { InheritanceCase } from "@/types/shared"
import { createCase, updateCase } from "@/lib/api/cases"
import { toProgressSteps, toProgressItems, toExpenses, toExpenseItems } from "@/lib/case-converters"
import { CASES_QUERY_KEY } from "@/hooks/use-cases"
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
import { isConflictError, CONFLICT_MESSAGE } from "@/lib/error-utils"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import { useSectionState } from "@/hooks/use-section-state"
import {
    calculateEstimateNetRevenue,
    calculateNetRevenue,
    getCaseApiPayload,
    getCaseReturnPath,
    getNeedsConfirmedFee,
    hasInvalidSpecialAddition,
    parseCaseFieldValue,
    SECTION_IDS,
    shouldPromptForConfirmedFee,
} from "./edit-case-form-utils"
import { useEditCaseMasters } from "./use-edit-case-masters"
import {
    consumeCaseFormDraft,
    discardCaseFormDraft,
    getCaseFormDraftKey,
    saveCaseFormDraft,
} from "./case-form-draft"
import { shouldCloseCaseDetailSections } from "@/lib/case-detail-section-state"

const CLOSED_SECTION_DEFAULTS = Object.fromEntries(
    SECTION_IDS.map((id) => [id, false]),
) as Record<string, boolean>

const CREATE_SECTION_DEFAULTS = {
    ...CLOSED_SECTION_DEFAULTS,
    basicInfo: true,
}

export function EditCaseForm({ initialData, isCreateMode = false }: { initialData: InheritanceCase, isCreateMode?: boolean }) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const toast = useToast()
    const searchParams = useSearchParams()
    const draftKey = getCaseFormDraftKey(initialData, isCreateMode)
    const [formData, setFormData] = useState<InheritanceCase>(() =>
        consumeCaseFormDraft(draftKey, initialData, isCreateMode) ?? initialData
    )
    const { isDirty, resetBaseline } = useUnsavedChanges(formData)
    const sections = useSectionState(
        [...SECTION_IDS],
        isCreateMode ? CREATE_SECTION_DEFAULTS : CLOSED_SECTION_DEFAULTS,
        {
            persist: !isCreateMode,
            getInitialStates: () => {
                if (isCreateMode || !shouldCloseCaseDetailSections(searchParams)) return undefined
                return CLOSED_SECTION_DEFAULTS
            },
        },
    )
    const [showLeaveModal, setShowLeaveModal] = useState(false)
    const [exportDocType, setExportDocType] = useState<"estimate" | "invoice" | "invoice-request" | null>(null)
    const {
        assignees,
        referrers,
        heirPersons,
        relatedPartyPersons,
        setHeirPersons,
        setRelatedPartyPersons,
    } = useEditCaseMasters()

    useEffect(() => {
        const saved = searchParams.get("saved")
        const closeSections = shouldCloseCaseDetailSections(searchParams)
        if (saved === "assignees" || saved === "referrers") {
            toast.success(saved === "assignees" ? "担当者設定を保存しました" : "紹介者設定を保存しました")
        }
        if (saved === "assignees" || saved === "referrers" || closeSections) {
            router.replace(getCaseReturnPath(formData, isCreateMode))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams])

    const [isSaving, setIsSaving] = useState(false)
    const [auditRefreshKey, setAuditRefreshKey] = useState(0)

    const currencyChange = (field: keyof InheritanceCase) => (value: string | undefined) =>
        setFormData((prev) => ({ ...prev, [field]: value ? Number(value) : 0 }))

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        if (shouldPromptForConfirmedFee(name, value, formData)) {
            sections.open("financial")
        }
        setFormData((prev) => ({
            ...prev,
            [name]: parseCaseFieldValue(name, value),
        }))
    }

    const preserveDraftBeforeMasterNavigation = () => {
        saveCaseFormDraft(draftKey, formData, isCreateMode)
    }

    const doSave = async (): Promise<boolean> => {
        setIsSaving(true)
        try {
            const payload = getCaseApiPayload(formData)
            if (isCreateMode) {
                await createCase(payload)
                await queryClient.invalidateQueries({ queryKey: CASES_QUERY_KEY })
                discardCaseFormDraft(draftKey)
                toast.success("新規登録しました")
                router.push("/")
                return true
            } else {
                const updatedAt = formData.updatedAt ? new Date(formData.updatedAt).toISOString() : undefined
                const updated = await updateCase(formData.id, payload, updatedAt)
                await queryClient.invalidateQueries({ queryKey: CASES_QUERY_KEY })
                setFormData(updated)
                resetBaseline(updated)
                discardCaseFormDraft(draftKey)
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

        if (hasInvalidSpecialAddition(formData)) {
            toast.warning("特別業務報酬額の内容を入力してください")
            return
        }

        await doSave()
    }

    const returnToPath = getCaseReturnPath(formData, isCreateMode)
    const needsConfirmedFee = getNeedsConfirmedFee(formData)

    const netRevenue = useMemo(() =>
        calculateNetRevenue(formData),
        [formData]
    )

    const estimateNetRevenue = useMemo(() => calculateEstimateNetRevenue(formData), [formData])

    return (
        <div className="space-y-2 text-xs [&_input:not([type=checkbox])]:h-9 [&_input:not([type=checkbox])]:text-xs [&_select]:text-xs [&_textarea]:text-xs">
            {!isCreateMode && (
                <div className="mb-2 flex items-center justify-between border-b pb-2">
                    <h1 className="text-lg font-bold tracking-tight">案件詳細</h1>
                    <div className="flex justify-end">
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
                onMasterEditNavigate={preserveDraftBeforeMasterNavigation}
            />

            {formData.progress && (
                <CollapsibleSection title="進捗管理" icon={ListChecks} isOpen={sections.isOpen("progress")} onToggle={() => sections.toggle("progress")} badge={formData.status} compact>
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

            <CollapsibleSection title="立替金" icon={Receipt} isOpen={sections.isOpen("expenses")} onToggle={() => sections.toggle("expenses")} badge={`${(formData.expenses || []).length}件`} compact>
                <ExpenseEditor
                    expenses={toExpenses(formData.expenses || [])}
                    deceasedName={formData.deceasedName}
                    heirs={formData.heirs || []}
                    onChange={(expenses) => setFormData(prev => ({ ...prev, expenses: toExpenseItems(expenses) }))}
                />
            </CollapsibleSection>

            <CollapsibleSection title="相続人" icon={Users} isOpen={sections.isOpen("heirs")} onToggle={() => sections.toggle("heirs")} badge={`${(formData.heirs || []).length}件`} compact>
                <HeirListEditor
                    heirs={formData.heirs || []}
                    persons={heirPersons}
                    dateOfDeath={formData.dateOfDeath}
                    onChange={(heirs) => setFormData(prev => ({ ...prev, heirs }))}
                    onPersonsChange={setHeirPersons}
                />
            </CollapsibleSection>

            <CollapsibleSection title="関係者" icon={Briefcase} isOpen={sections.isOpen("relatedParties")} onToggle={() => sections.toggle("relatedParties")} badge={`${(formData.relatedParties || []).length}件`} compact>
                <RelatedPartyListEditor
                    parties={formData.relatedParties || []}
                    persons={relatedPartyPersons}
                    onChange={(relatedParties) => setFormData(prev => ({ ...prev, relatedParties }))}
                    onPersonsChange={setRelatedPartyPersons}
                />
            </CollapsibleSection>

            <CollapsibleSection title="メモ" icon={StickyNote} isOpen={sections.isOpen("memo")} onToggle={() => sections.toggle("memo")} compact>
                <textarea
                    value={formData.memo || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, memo: e.target.value }))}
                    placeholder="自由にメモを記載できます"
                    rows={4}
                    className="w-full min-h-[64px] resize-y rounded-md border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
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
