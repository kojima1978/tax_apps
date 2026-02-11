"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { SelectField } from "@/components/ui/SelectField"
import { CurrencyField } from "@/components/ui/CurrencyField"
import type { InheritanceCase, Assignee, Referrer } from "@tax-apps/shared"
import { createCase, updateCase } from "@/lib/api/cases"
import { getAssignees } from "@/lib/api/assignees"
import { getReferrers } from "@/lib/api/referrers"
import { useToast } from "@/components/ui/Toast"
import { ProgressEditor } from "./ProgressEditor"
import { ContactListEditor } from "./ContactListEditor"
import { formatCurrency } from "@/lib/analytics-utils"

export function EditCaseForm({ initialData, isCreateMode = false }: { initialData: InheritanceCase, isCreateMode?: boolean }) {
    const router = useRouter()
    const toast = useToast()
    const searchParams = useSearchParams()
    const [formData, setFormData] = useState<InheritanceCase>(initialData)
    const [assignees, setAssignees] = useState<Assignee[]>([])
    const [referrers, setReferrers] = useState<Referrer[]>([])
    const [showSaveMessage, setShowSaveMessage] = useState(false)
    const [saveMessageType, setSaveMessageType] = useState<"assignees" | "referrers" | null>(null)

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
            setSaveMessageType(saved)
            setShowSaveMessage(true)
            setTimeout(() => setShowSaveMessage(false), 3000)
            const currentPath = window.location.pathname
            router.replace(currentPath)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams])

    const [isSaving, setIsSaving] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({
            ...prev,
            [name]: ["taxAmount", "feeAmount", "fiscalYear"].includes(name) ? Number(value) : value,
        }))
    }

    const handleSave = async () => {
        if (!formData.deceasedName || formData.deceasedName.trim() === "") {
            toast.warning("被相続人氏名を入力してください")
            return
        }

        setIsSaving(true)
        try {
            if (isCreateMode) {
                await createCase({ ...formData, acceptanceStatus: formData.acceptanceStatus || "未判定" })
                toast.success("新規登録しました")
                router.push("/")
            } else {
                await updateCase(formData.id, formData)
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

    const netRevenue = useMemo(() =>
        (formData.feeAmount || 0) - (formData.referralFeeAmount || 0),
        [formData.feeAmount, formData.referralFeeAmount]
    )

    const estimateNetRevenue = useMemo(() =>
        Math.floor((formData.estimateAmount || 0) * (1 - (formData.referralFeeRate || 0) / 100)),
        [formData.estimateAmount, formData.referralFeeRate]
    )

    return (
        <div className="space-y-6">
            {showSaveMessage && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center justify-between shadow-sm">
                    <span>
                        {saveMessageType === "assignees" ? "担当者設定を保存しました" : "紹介者設定を保存しました"}
                    </span>
                    <button onClick={() => setShowSaveMessage(false)} className="text-green-600 hover:text-green-800 font-bold text-lg">
                        ×
                    </button>
                </div>
            )}
            <div className="grid grid-cols-2 gap-6">
                {!isCreateMode && (
                    <div className="space-y-2">
                        <Label htmlFor="id">案件ID (変更不可)</Label>
                        <Input id="id" value={formData.id} disabled className="bg-muted" />
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="deceasedName">被相続人氏名</Label>
                    <Input id="deceasedName" name="deceasedName" value={formData.deceasedName} onChange={handleChange} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="fiscalYear">年度</Label>
                    <SelectField id="fiscalYear" name="fiscalYear" value={formData.fiscalYear} onChange={handleChange}>
                        {Array.from({ length: 21 }, (_, i) => 2015 + i).map(year => (
                            <option key={year} value={year}>{year}年度</option>
                        ))}
                    </SelectField>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="dateOfDeath">相続開始日</Label>
                    <Input id="dateOfDeath" name="dateOfDeath" type="date" value={formData.dateOfDeath} onChange={handleChange} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="acceptanceStatus">受託</Label>
                    <SelectField
                        id="acceptanceStatus"
                        name="acceptanceStatus"
                        value={formData.acceptanceStatus || "未判定"}
                        onChange={(e) => {
                            const val = e.target.value as "受託可" | "受託不可" | "未判定" | undefined
                            setFormData(prev => {
                                let newStatus = prev.status
                                if (val === "未判定") newStatus = "未着手"
                                else if (val === "受託不可") newStatus = "完了"
                                return { ...prev, acceptanceStatus: val, status: newStatus }
                            })
                        }}
                    >
                        <option value="未判定">未判定</option>
                        <option value="受託可">受託可</option>
                        <option value="受託不可">受託不可</option>
                    </SelectField>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="status">進行</Label>
                    <SelectField id="status" name="status" value={formData.status} onChange={handleChange}>
                        <option value="未着手" disabled={formData.acceptanceStatus === "受託不可"}>未着手</option>
                        <option value="進行中" disabled={formData.acceptanceStatus === "未判定" || formData.acceptanceStatus === "受託不可"}>進行中</option>
                        <option value="完了" disabled={formData.acceptanceStatus === "未判定"}>完了</option>
                    </SelectField>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="assignee">担当者</Label>
                    <SelectField id="assignee" name="assignee" value={formData.assignee} onChange={handleChange}>
                        <option value="">担当者を選択</option>
                        {assignees.filter(a => a.active !== false).map((a) => (
                            <option key={a.id} value={a.name}>
                                {a.department ? `${a.department} / ${a.name}` : a.name}
                            </option>
                        ))}
                    </SelectField>
                    <div className="text-right text-xs">
                        <a href={`/settings/assignees?returnTo=${isCreateMode ? '/new' : `/${formData.id}`}`} className="text-muted-foreground hover:underline hover:text-primary">
                            担当者を追加・編集
                        </a>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="referrer">紹介者</Label>
                    <SelectField id="referrer" name="referrer" value={formData.referrer || ""} onChange={handleChange}>
                        <option value="">紹介者を選択</option>
                        {referrers.filter(r => r.active !== false).map((r) => {
                            const val = `${r.company} / ${r.name}`
                            const display = r.department ? `${r.company} / ${r.department} / ${r.name}` : `${r.company} / ${r.name}`
                            return <option key={r.id} value={val}>{display}</option>
                        })}
                    </SelectField>
                    <div className="text-right text-xs">
                        <a href={`/settings/referrers?returnTo=${isCreateMode ? '/new' : `/${formData.id}`}`} className="text-muted-foreground hover:underline hover:text-primary">
                            紹介者を追加・編集
                        </a>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="propertyValue">取得財産の価格</Label>
                    <CurrencyField
                        id="propertyValue"
                        name="propertyValue"
                        value={formData.propertyValue}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, propertyValue: value ? Number(value) : 0 }))}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="taxAmount">申告納税額</Label>
                    <CurrencyField
                        id="taxAmount"
                        name="taxAmount"
                        value={formData.taxAmount}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, taxAmount: value ? Number(value) : 0 }))}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="estimateAmount">見積額（税抜）</Label>
                    <CurrencyField
                        id="estimateAmount"
                        name="estimateAmount"
                        value={formData.estimateAmount}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, estimateAmount: value ? Number(value) : 0 }))}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="feeAmount">報酬額（税抜）</Label>
                    <CurrencyField
                        id="feeAmount"
                        name="feeAmount"
                        value={formData.feeAmount}
                        onValueChange={(value) => {
                            const newFee = value ? Number(value) : 0
                            const rate = formData.referralFeeRate || 0
                            const newReferralAmount = Math.floor(newFee * (rate / 100))
                            setFormData((prev) => ({ ...prev, feeAmount: newFee, referralFeeAmount: newReferralAmount }))
                        }}
                    />
                </div>

                <div className="space-y-4 col-span-2 border rounded-lg p-4 bg-muted/30">
                    <Label className="text-base font-semibold">紹介料・担当者売上計算</Label>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="referralFeeRate">紹介料率 (%)</Label>
                            <Input
                                id="referralFeeRate"
                                name="referralFeeRate"
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={formData.referralFeeRate?.toString() ?? ""}
                                onChange={(e) => {
                                    const val = e.target.value
                                    const rate = val === "" ? undefined : Number(val)
                                    const currentFee = formData.feeAmount || 0
                                    const newReferralAmount = rate !== undefined ? Math.floor(currentFee * (rate / 100)) : 0
                                    setFormData((prev) => ({ ...prev, referralFeeRate: rate, referralFeeAmount: newReferralAmount }))
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="referralFeeAmount">紹介料額</Label>
                            <CurrencyField
                                id="referralFeeAmount"
                                name="referralFeeAmount"
                                value={formData.referralFeeAmount || 0}
                                onValueChange={(value) => setFormData((prev) => ({ ...prev, referralFeeAmount: value ? Number(value) : 0 }))}
                            />
                        </div>
                    </div>
                    <div className="pt-2 border-t mt-2 space-y-2">
                        <div className="flex justify-between items-end">
                            <Label className="text-base">担当者売上（手取り）</Label>
                            <div className="text-xl font-bold">{formatCurrency(netRevenue)}</div>
                        </div>
                        <p className="text-xs text-muted-foreground text-right">※ 報酬額（税抜） - 紹介料額</p>
                        <div className="flex justify-between items-end pt-2 border-t border-dashed">
                            <Label className="text-sm text-muted-foreground">（参考）見積ベースの手取り予測</Label>
                            <div className="text-lg font-semibold text-muted-foreground">{formatCurrency(estimateNetRevenue)}</div>
                        </div>
                        <p className="text-xs text-muted-foreground text-right">※ 見積額 × (1 - 紹介料率)</p>
                    </div>
                </div>

                {formData.progress && (
                    <ProgressEditor
                        progress={formData.progress}
                        onChange={(progress) => setFormData(prev => ({ ...prev, progress }))}
                    />
                )}

                <ContactListEditor
                    contacts={formData.contacts || []}
                    onChange={(contacts) => setFormData(prev => ({ ...prev, contacts }))}
                />
            </div>

            <div className="sticky bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t mt-4 -mx-6 px-6 shadow-lg z-10 flex justify-end gap-4">
                <Button onClick={handleSave} disabled={isSaving} variant="outline" className="min-w-[120px] font-bold shadow-sm">
                    {isSaving ? "処理中..." : isCreateMode ? "新規登録" : "変更を保存"}
                </Button>
            </div>
        </div>
    )
}
