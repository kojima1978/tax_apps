"use client"

import { useState, useEffect, useMemo } from "react"
import { flushSync } from "react-dom"
import { useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/Button"
import { StickyActionBar } from "@/components/ui/StickyActionBar"
import type { InheritanceCase } from "@/types/shared"
import { createCase, updateCase, getCaseDuplicates } from "@/lib/api/cases"
import type { CaseDuplicateResult } from "@/lib/case-duplicates"
import { CaseDuplicateCheck, CaseDuplicateCandidates } from "./CaseDuplicateCheck"
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
import { ListChecks, Receipt, Users, Briefcase, StickyNote, FileText } from "lucide-react"
import { isConflictError, CONFLICT_MESSAGE } from "@/lib/error-utils"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import { useSectionState } from "@/hooks/use-section-state"
import {
    calculateEstimateNetRevenue,
    calculateNetRevenue,
    getCaseApiPayload,
    getCaseReturnPath,
    getNeedsConfirmedFee,
    hasInvalidExpense,
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
import { CaseSectionNavigation, type CaseSectionNavigationItem } from "./CaseSectionNavigation"
import { CaseDetailHeader } from "./CaseDetailHeader"
import { CaseWorkspaceSummary } from "./CaseWorkspaceSummary"
import { CaseBrowseNavigation } from "./CaseBrowseNavigation"
import { getCaseListReturnHref, readCaseListNavigation, saveCaseListNavigation } from "@/lib/case-list-navigation"
import { getChangedCaseSections, type MissingCaseInput } from "./case-workspace-utils"

const CLOSED_SECTION_DEFAULTS = Object.fromEntries(
    SECTION_IDS.map((id) => [id, false]),
) as Record<string, boolean>

const CREATE_SECTION_DEFAULTS = {
    ...CLOSED_SECTION_DEFAULTS,
    basicInfo: true,
}

const CASE_SECTION_NAVIGATION_ITEMS = [
    { id: "case-basic-info", label: "基本情報", sectionKey: "basicInfo" },
    { id: "case-progress", label: "進捗管理", sectionKey: "progress" },
    { id: "case-financial", label: "金額情報", sectionKey: "financial" },
    { id: "case-expenses", label: "立替金", sectionKey: "expenses" },
    { id: "case-heirs", label: "相続人", sectionKey: "heirs" },
    { id: "case-related-parties", label: "関係者", sectionKey: "relatedParties" },
    { id: "case-memo", label: "メモ", sectionKey: "memo" },
    { id: "case-audit-log", label: "変更履歴", sectionKey: "auditLog" },
] as const satisfies readonly CaseSectionNavigationItem[]

export function EditCaseForm({ initialData, isCreateMode = false }: { initialData: InheritanceCase, isCreateMode?: boolean }) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const toast = useToast()
    const searchParams = useSearchParams()
    const draftKey = getCaseFormDraftKey(initialData, isCreateMode)
    const [formData, setFormData] = useState<InheritanceCase>(() =>
        consumeCaseFormDraft(draftKey, initialData, isCreateMode) ?? initialData
    )
    const { isDirty, resetBaseline, baselineData } = useUnsavedChanges(formData, initialData)
    const changedSections = useMemo(() => getChangedCaseSections(formData, baselineData), [formData, baselineData])
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
    const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)
    const [showOtherActions, setShowOtherActions] = useState(false)
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
    const [duplicateConfirmation, setDuplicateConfirmation] = useState<CaseDuplicateResult | null>(null)
    const [saveFailed, setSaveFailed] = useState(false)
    const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
    const [auditRefreshKey, setAuditRefreshKey] = useState(0)

    const currencyChange = (field: keyof InheritanceCase) => (value: string | undefined) =>
        setFormData((prev) => ({ ...prev, [field]: value ? Number(value) : 0 }))

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        if (shouldPromptForConfirmedFee(name, value, formData)) {
            sections.open("financial")
            window.dispatchEvent(new Event("itcm:focus-fee"))
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
        setSaveFailed(false)
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
                setLastSavedAt(new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" }))
                discardCaseFormDraft(draftKey)
                setAuditRefreshKey(k => k + 1)
                toast.success("保存しました")
                return true
            }
        } catch (e) {
            setSaveFailed(true)
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

    const handleSave = async (): Promise<boolean> => {
        if (!formData.deceasedName || formData.deceasedName.trim() === "") {
            toast.warning("被相続人氏名を入力してください")
            sections.open("basicInfo")
            requestAnimationFrame(() => document.getElementById("deceasedName")?.focus())
            return false
        }

        if (hasInvalidSpecialAddition(formData)) {
            toast.warning("特別業務報酬額の内容を入力してください")
            sections.open("financial")
            return false
        }

        if (hasInvalidExpense(formData)) {
            toast.warning("立替金の内容を入力してください")
            sections.open("expenses")
            requestAnimationFrame(() => {
                document.querySelector<HTMLElement>('[aria-label="立替金の内容"]')?.focus()
            })
            return false
        }

        if (isCreateMode) {
            setIsSaving(true)
            try {
                const result = await getCaseDuplicates({ deceasedName: formData.deceasedName, deceasedNameKana: formData.deceasedNameKana, dateOfDeath: formData.dateOfDeath })
                if (result.total > 0) {
                    setDuplicateConfirmation(result)
                    return false
                }
            } catch {
                toast.error("重複チェックに失敗しました。通信状態を確認して、もう一度登録してください。")
                return false
            } finally {
                setIsSaving(false)
            }
        }
        return doSave()
    }

    const performNavigation = (href: string) => {
        const context = readCaseListNavigation()
        const match = href.match(/^\/(\d+)(?:[?/#]|$)/)
        const id = match ? Number(match[1]) : null
        if (context && id && context.cases.some(item => item.id === id)) saveCaseListNavigation({ ...context, openedId: id })
        router.push(href)
    }
    const navigate = (href: string) => {
        if (isDirty) { setPendingNavigation(href); setShowLeaveModal(true) }
        else performNavigation(href)
    }

    const returnToPath = getCaseReturnPath(formData, isCreateMode)
    const needsConfirmedFee = getNeedsConfirmedFee(formData)

    const netRevenue = useMemo(() =>
        calculateNetRevenue(formData),
        [formData]
    )

    const estimateNetRevenue = useMemo(() => calculateEstimateNetRevenue(formData), [formData])
    const caseSectionNavigationItems = useMemo(
        () => formData.progress
            ? CASE_SECTION_NAVIGATION_ITEMS
            : CASE_SECTION_NAVIGATION_ITEMS.filter((item) => item.sectionKey !== "progress"),
        [formData.progress],
    )

    const navigateToMissingInput = (item: MissingCaseInput) => {
        flushSync(() => {
            sections.open(item.sectionKey)
            if (item.sectionKey === "financial") window.dispatchEvent(new Event("itcm:focus-fee"))
        })
        window.requestAnimationFrame(() => {
            const section = document.getElementById(item.targetId)
            section?.scrollIntoView({ block: "start" })
            if (item.field) section?.querySelector<HTMLElement>(`[id="${item.field}"], [name="${item.field}"]`)?.focus({ preventScroll: true })
        })
    }

    return (
        <div className="case-detail-readable space-y-3 text-sm" onClickCapture={event => {
            const anchor = (event.target as HTMLElement).closest("a")
            if (!anchor || !isDirty) return
            const url = new URL(anchor.href)
            if (url.origin !== location.origin || !url.pathname.startsWith("/itcm")) return
            if (url.pathname === location.pathname && url.search === location.search) return
            event.preventDefault(); event.stopPropagation()
            const href = url.pathname.replace(/^\/itcm/, "") || "/"
            setPendingNavigation(href + url.search + url.hash); setShowLeaveModal(true)
        }}>
            {!isCreateMode && (
                <>
                    <CaseBrowseNavigation id={formData.id} disabled={isSaving} onNavigate={navigate} />
                    <CaseDetailHeader
                        formData={formData}
                        allOpen={sections.allOpen}
                        onToggleAll={sections.toggleAll}
                    />
                    <CaseSectionNavigation
                        items={caseSectionNavigationItems}
                        onOpenSection={sections.open}
                        changedSections={changedSections}
                    />
                </>
            )}

            <CaseWorkspaceSummary data={formData} savedName={baselineData.deceasedName} isCreateMode={isCreateMode} onNavigate={navigateToMissingInput} />

            <div id="case-basic-info" className="scroll-mt-28">
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
                {isCreateMode && <CaseDuplicateCheck deceasedName={formData.deceasedName} deceasedNameKana={formData.deceasedNameKana} dateOfDeath={formData.dateOfDeath} />}
            </div>

            {formData.progress && (
                <div id="case-progress" className="scroll-mt-28">
                    <CollapsibleSection title="進捗管理" icon={ListChecks} isOpen={sections.isOpen("progress")} onToggle={() => sections.toggle("progress")} badge={formData.status} compact>
                        <ProgressEditor
                            progress={toProgressSteps(formData.progress)}
                            onChange={(steps) => setFormData(prev => ({ ...prev, progress: toProgressItems(steps) }))}
                            formData={formData}
                            isCreateMode={isCreateMode}
                            handleChange={handleChange}
                            setFormData={setFormData}
                            onNeedsConfirmedFee={() => { sections.open("financial"); window.dispatchEvent(new Event("itcm:focus-fee")) }}
                        />
                    </CollapsibleSection>
                </div>
            )}

            <div id="case-financial" className="scroll-mt-28">
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
            </div>

            <div id="case-expenses" className="scroll-mt-28">
                <CollapsibleSection title="立替金" icon={Receipt} isOpen={sections.isOpen("expenses")} onToggle={() => sections.toggle("expenses")} badge={`${(formData.expenses || []).length}件`} compact>
                    <ExpenseEditor
                        expenses={toExpenses(formData.expenses || [])}
                        deceasedName={formData.deceasedName}
                        heirs={formData.heirs || []}
                        hasUnsavedChanges={isDirty || isCreateMode}
                        onChange={(expenses) => setFormData(prev => ({ ...prev, expenses: toExpenseItems(expenses) }))}
                    />
                </CollapsibleSection>
            </div>

            <div id="case-heirs" className="scroll-mt-28">
                <CollapsibleSection title="相続人" icon={Users} isOpen={sections.isOpen("heirs")} onToggle={() => sections.toggle("heirs")} badge={`${(formData.heirs || []).length}件`} compact>
                    <HeirListEditor
                        heirs={formData.heirs || []}
                        persons={heirPersons}
                        dateOfDeath={formData.dateOfDeath}
                        deceasedName={formData.deceasedName}
                        onChange={(heirs) => setFormData(prev => ({ ...prev, heirs }))}
                        onPersonsChange={setHeirPersons}
                    />
                </CollapsibleSection>
            </div>

            <div id="case-related-parties" className="scroll-mt-28">
                <CollapsibleSection title="関係者" icon={Briefcase} isOpen={sections.isOpen("relatedParties")} onToggle={() => sections.toggle("relatedParties")} badge={`${(formData.relatedParties || []).length}件`} compact>
                    <RelatedPartyListEditor
                        parties={formData.relatedParties || []}
                        persons={relatedPartyPersons}
                        onChange={(relatedParties) => setFormData(prev => ({ ...prev, relatedParties }))}
                        onPersonsChange={setRelatedPartyPersons}
                    />
                </CollapsibleSection>
            </div>

            <div id="case-memo" className="scroll-mt-28">
                <CollapsibleSection title="メモ" icon={StickyNote} isOpen={sections.isOpen("memo")} onToggle={() => sections.toggle("memo")} compact>
                    <textarea
                        value={formData.memo || ""}
                        onChange={(e) => setFormData(prev => ({ ...prev, memo: e.target.value }))}
                        placeholder="自由にメモを記載できます"
                        rows={4}
                        className="w-full min-h-[64px] resize-y rounded-md border bg-background px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </CollapsibleSection>
            </div>

            {!isCreateMode && (
                <div id="case-audit-log" className="scroll-mt-28">
                    <AuditLogSection
                        caseId={formData.id}
                        assignees={assignees}
                        referrers={referrers}
                        isOpen={sections.isOpen("auditLog")}
                        onToggle={() => sections.toggle("auditLog")}
                        refreshKey={auditRefreshKey}
                    />
                </div>
            )}

            <StickyActionBar className="flex-wrap items-center gap-2 !p-3">
                <span role="status" className={`mr-auto w-full text-xs sm:w-auto ${saveFailed || isDirty ? "text-amber-800" : "text-muted-foreground"}`}>
                    {isSaving ? "保存中…" : saveFailed ? "保存に失敗しました（未保存）" : isDirty ? `未保存 · ${changedSections.length}セクションに変更` : isCreateMode ? "未登録" : lastSavedAt ? `保存済み · ${lastSavedAt}` : "保存済み"}
                </span>
                <Button
                    onClick={() => navigate(getCaseListReturnHref(formData.id))}
                    variant="ghost"
                    className="min-w-0 !px-3"
                    disabled={isSaving}
                >
                    戻る
                </Button>
                <div className="flex min-w-0 flex-1 justify-end gap-2 sm:flex-none">
                    {!isCreateMode && (
                        <>
                            <Button variant="outline" className="!px-3 sm:hidden" onClick={() => setShowOtherActions(true)} disabled={isSaving}>その他の操作</Button>
                            <Button variant="outline" className="hidden sm:inline-flex" onClick={() => setExportDocType("estimate")} disabled={isSaving}>
                                <FileText className="mr-1.5 h-4 w-4" />見積書
                            </Button>
                            <Button variant="outline" className="hidden sm:inline-flex" onClick={() => setExportDocType("invoice")} disabled={isSaving}>
                                <FileText className="mr-1.5 h-4 w-4" />請求書
                            </Button>
                            <Button variant="outline" className="hidden sm:inline-flex" onClick={() => setExportDocType("invoice-request")} disabled={isSaving}>
                                <FileText className="mr-1.5 h-4 w-4" />依頼票
                            </Button>
                        </>
                    )}
                    <Button onClick={handleSave} disabled={isSaving} className="min-w-[110px] !px-3">
                        {isSaving ? "処理中..." : isCreateMode ? "新規登録" : "変更を保存"}
                    </Button>
                </div>
            </StickyActionBar>

            <Modal
                isOpen={showLeaveModal}
                onClose={() => setShowLeaveModal(false)}
                title="未保存の変更があります"
            >
                <p className="text-sm mb-6">変更内容が保存されていません。保存してから移動できます。</p>
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => { setShowLeaveModal(false); performNavigation(pendingNavigation ?? getCaseListReturnHref(formData.id)) }} disabled={isSaving}>
                        保存せず移動
                    </Button>
                    <Button
                        disabled={isSaving}
                        onClick={async () => {
                            const saved = await handleSave()
                            if (saved) {
                                setShowLeaveModal(false)
                                performNavigation(pendingNavigation ?? getCaseListReturnHref(formData.id))
                            }
                        }}
                    >
                        保存して移動
                    </Button>
                </div>
            </Modal>

            <Modal isOpen={duplicateConfirmation !== null} onClose={() => setDuplicateConfirmation(null)} title="登録前に既存案件を確認してください">
                {duplicateConfirmation && <CaseDuplicateCandidates result={duplicateConfirmation} />}
                <p className="my-4 text-sm text-slate-600">同じ案件でないことを確認した場合のみ、新しい案件として登録してください。</p>
                <div className="flex flex-wrap justify-end gap-3">
                    <Button variant="outline" onClick={() => setDuplicateConfirmation(null)}>入力に戻る</Button>
                    <Button disabled={isSaving} onClick={() => { setDuplicateConfirmation(null); void doSave() }}>別案件として登録する</Button>
                </div>
            </Modal>

            <Modal isOpen={showOtherActions} onClose={() => setShowOtherActions(false)} title="その他の操作">
                <div className="grid gap-3">{([{ type: "estimate", label: "見積書" }, { type: "invoice", label: "請求書" }, { type: "invoice-request", label: "依頼票" }] as const).map(item => <Button key={item.type} variant="outline" onClick={() => { setShowOtherActions(false); setExportDocType(item.type) }} disabled={isSaving}><FileText className="mr-2 h-4 w-4" />{item.label}</Button>)}</div>
            </Modal>

            {exportDocType && (
                <DocumentExportModal
                    isOpen={!!exportDocType}
                    onClose={() => setExportDocType(null)}
                    caseData={formData}
                    docType={exportDocType}
                    hasUnsavedChanges={isDirty}
                    onSave={handleSave}
                />
            )}
        </div>
    )
}
