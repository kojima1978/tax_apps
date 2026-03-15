"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/Button"
import { StickyActionBar } from "@/components/ui/StickyActionBar"
import type { InheritanceCase, Assignee, Referrer, CaseStatus } from "@/types/shared"
import { createCase, updateCase } from "@/lib/api/cases"
import { toProgressSteps, toProgressItems, toContacts, toContactItems } from "@/lib/case-converters"
import { CASES_QUERY_KEY } from "@/hooks/use-cases"
import { getAssignees } from "@/lib/api/assignees"
import { getReferrers } from "@/lib/api/referrers"
import { useToast } from "@/components/ui/Toast"
import { ProgressEditor } from "./ProgressEditor"
import { ContactListEditor } from "./ContactListEditor"
import { BasicInfoSection } from "./BasicInfoSection"
import { FinancialSection } from "./FinancialSection"
import { CollapsibleSection } from "@/components/ui/CollapsibleSection"
import { ListChecks, Phone, StickyNote } from "lucide-react"
import { STATUS_STEP_MAP, STATUS_ORDER } from "@/lib/progress-utils"

export function EditCaseForm({ initialData, isCreateMode = false }: { initialData: InheritanceCase, isCreateMode?: boolean }) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const toast = useToast()
    const searchParams = useSearchParams()
    const [formData, setFormData] = useState<InheritanceCase>(initialData)
    const [assignees, setAssignees] = useState<Assignee[]>([])
    const [referrers, setReferrers] = useState<Referrer[]>([])
    useEffect(() => {
        const loadMasters = async () => {
            try {
                const [as, rs] = await Promise.all([getAssignees(), getReferrers()])
                setAssignees(as)
                setReferrers(rs)
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

    const currencyChange = (field: keyof InheritanceCase) => (value: string | undefined) =>
        setFormData((prev) => ({ ...prev, [field]: value ? Number(value) : 0 }))

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        const numericFields = ["taxAmount", "feeAmount", "fiscalYear"]
        const fkFields = ["assigneeId", "referrerId"]
        setFormData((prev) => ({
            ...prev,
            [name]: numericFields.includes(name) ? Number(value)
                : fkFields.includes(name) ? (value ? Number(value) : null)
                : value,
        }))
    }

    // Convert normalized DB shapes to API input shapes
    const toApiPayload = () => {
        const contacts = formData.contacts ? toContacts(formData.contacts) : undefined
        const progress = formData.progress ? toProgressSteps(formData.progress) : undefined
        return {
            deceasedName: formData.deceasedName,
            dateOfDeath: formData.dateOfDeath,
            fiscalYear: formData.fiscalYear,
            status: formData.status,
            acceptanceStatus: formData.acceptanceStatus || "未判定",
            taxAmount: formData.taxAmount,
            feeAmount: formData.feeAmount,
            estimateAmount: formData.estimateAmount,
            propertyValue: formData.propertyValue,
            referralFeeRate: formData.referralFeeRate,
            referralFeeAmount: formData.referralFeeAmount,
            summary: formData.summary || null,
            memo: formData.memo || null,
            assigneeId: formData.assigneeId || null,
            referrerId: formData.referrerId || null,
            contacts,
            progress,
        }
    }

    /** ステータスと進捗ステップの整合性チェック */
    const checkStatusProgressConsistency = (): { warnings: string[]; suggestion?: { status: CaseStatus; message: string } } => {
        const progress = formData.progress ? toProgressSteps(formData.progress) : []
        const status = formData.status
        const warnings: string[] = []

        // ステータスに対して期待される進捗ステップに日付があるか
        for (const { status: expectedStatus, stepName } of STATUS_STEP_MAP) {
            const step = progress.find(s => s.name === stepName)
            if (status === expectedStatus && !step?.date) {
                warnings.push(`ステータスが「${expectedStatus}」ですが、進捗の「${stepName}」に日付が入力されていません。`)
            }
        }

        // 逆方向: 進捗に日付があるのにステータスが手前のまま
        const currentIdx = STATUS_ORDER.indexOf(status as CaseStatus)
        if (currentIdx >= 0) {
            for (let i = STATUS_STEP_MAP.length - 1; i >= 0; i--) {
                const { status: suggestedStatus, stepName } = STATUS_STEP_MAP[i]
                const suggestedIdx = STATUS_ORDER.indexOf(suggestedStatus)
                const step = progress.find(s => s.name === stepName)
                if (step?.date && suggestedIdx > currentIdx) {
                    return {
                        warnings,
                        suggestion: {
                            status: suggestedStatus,
                            message: `進捗の「${stepName}」に日付が入力されています。\nステータスを「${suggestedStatus}」に変更しますか？`,
                        },
                    }
                }
            }
        }

        return { warnings }
    }

    const handleSave = async () => {
        if (!formData.deceasedName || formData.deceasedName.trim() === "") {
            toast.warning("被相続人氏名を入力してください")
            return
        }

        // 整合性チェック
        const { warnings, suggestion } = checkStatusProgressConsistency()
        for (const w of warnings) {
            toast.warning(w)
        }
        if (suggestion && window.confirm(suggestion.message)) {
            setFormData(prev => ({ ...prev, status: suggestion.status }))
            // formDataを直接変更してpayloadに反映
            formData.status = suggestion.status
        }

        setIsSaving(true)
        try {
            const payload = toApiPayload()
            if (isCreateMode) {
                await createCase(payload)
                queryClient.removeQueries({ queryKey: CASES_QUERY_KEY })
                toast.success("新規登録しました")
                router.push("/")
            } else {
                await updateCase(formData.id, payload)
                toast.success("保存しました")
                router.refresh()
            }
        } catch (e) {
            console.error(e)
            toast.error("エラーが発生しました: " + String(e))
        } finally {
            setIsSaving(false)
        }
    }

    const returnToPath = isCreateMode ? '/new' : `/${formData.id}`

    const netRevenue = useMemo(() =>
        (formData.feeAmount || 0) - (formData.referralFeeAmount || 0),
        [formData.feeAmount, formData.referralFeeAmount]
    )

    const estimateNetRevenue = useMemo(() =>
        Math.floor((formData.estimateAmount || 0) * (1 - (formData.referralFeeRate || 0) / 100)),
        [formData.estimateAmount, formData.referralFeeRate]
    )

    return (
        <div className="space-y-4">
            <BasicInfoSection
                formData={formData}
                isCreateMode={isCreateMode}
                assignees={assignees}
                referrers={referrers}
                returnToPath={returnToPath}
                handleChange={handleChange}
                setFormData={setFormData}
            />

            <FinancialSection
                formData={formData}
                netRevenue={netRevenue}
                estimateNetRevenue={estimateNetRevenue}
                defaultOpen={!isCreateMode}
                currencyChange={currencyChange}
                setFormData={setFormData}
            />

            {formData.progress && (
                <CollapsibleSection title="進捗管理" icon={ListChecks} defaultOpen={!isCreateMode} badge={`${formData.progress.filter(s => s.date).length}/${formData.progress.length}`}>
                    <ProgressEditor
                        progress={toProgressSteps(formData.progress)}
                        onChange={(steps) => setFormData(prev => ({ ...prev, progress: toProgressItems(steps) }))}
                    />
                </CollapsibleSection>
            )}

            <CollapsibleSection title="連絡先" icon={Phone} defaultOpen={false} badge={`${(formData.contacts || []).length}件`}>
                <ContactListEditor
                    contacts={toContacts(formData.contacts || [])}
                    onChange={(contacts) => setFormData(prev => ({ ...prev, contacts: toContactItems(contacts) }))}
                />
            </CollapsibleSection>

            <CollapsibleSection title="メモ" icon={StickyNote} defaultOpen={!!formData.memo}>
                <textarea
                    value={formData.memo || ""}
                    onChange={(e) => setFormData(prev => ({ ...prev, memo: e.target.value }))}
                    placeholder="自由にメモを記載できます"
                    rows={4}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-y focus:outline-none focus:ring-1 focus:ring-primary min-h-[100px]"
                />
            </CollapsibleSection>

            <StickyActionBar>
                <Button onClick={() => router.push("/")} variant="ghost" className="min-w-[100px]" disabled={isSaving}>
                    キャンセル
                </Button>
                <Button onClick={handleSave} disabled={isSaving} variant="outline" className="min-w-[120px] font-bold shadow-sm">
                    {isSaving ? "処理中..." : isCreateMode ? "新規登録" : "変更を保存"}
                </Button>
            </StickyActionBar>
        </div>
    )
}
