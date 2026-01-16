"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { InheritanceCase } from "@/lib/mock-data"

import { Assignee } from "@/lib/assignee-data"
import { Referrer } from "@/lib/referrer-data"
import { useEffect } from "react"
import CurrencyInput from 'react-currency-input-field';

import { saveCase, createCase } from "@/lib/case-service"

import { getAssignees } from "@/lib/assignee-service"
import { getReferrers } from "@/lib/referrer-service"
import { useToast } from "@/components/ui/Toast"

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
                const [as, rs] = await Promise.all([
                    getAssignees(),
                    getReferrers()
                ])
                setAssignees(as)
                setReferrers(rs)
            } catch (e) {
                console.error("Failed to load masters", e)
            }
        }
        loadMasters()

        // Check for saved parameter
        const saved = searchParams.get("saved")
        if (saved === "assignees" || saved === "referrers") {
            setSaveMessageType(saved)
            setShowSaveMessage(true)
            // Auto-hide after 3 seconds
            setTimeout(() => {
                setShowSaveMessage(false)
            }, 3000)
            // Clean URL
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
            toast.warning("被相続人氏名を入力してください");
            return;
        }

        setIsSaving(true)
        try {
            if (isCreateMode) {
                await createCase(formData)
                console.log("Created data:", formData)
                toast.success("新規登録しました")
                router.push("/") // Redirect to list
            } else {
                await saveCase(formData)
                console.log("Saved data:", formData)
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

    return (
        <div className="space-y-6">
            {showSaveMessage && (
                <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center justify-between shadow-sm">
                    <span>
                        {saveMessageType === "assignees" ? "担当者設定を保存しました" : "紹介者設定を保存しました"}
                    </span>
                    <button
                        onClick={() => setShowSaveMessage(false)}
                        className="text-green-600 hover:text-green-800 font-bold text-lg"
                    >
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
                    <Input
                        id="deceasedName"
                        name="deceasedName"
                        value={formData.deceasedName}
                        onChange={handleChange}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="fiscalYear">年度</Label>
                    <div className="flex h-11 w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                        <select
                            id="fiscalYear"
                            name="fiscalYear"
                            value={formData.fiscalYear}
                            onChange={handleChange}
                            className="w-full bg-transparent outline-none"
                        >
                            {/* Generate years from 2015 to 2035 (21 years) */}
                            {Array.from({ length: 21 }, (_, i) => 2015 + i).map(year => (
                                <option key={year} value={year}>{year}年度</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="dateOfDeath">相続開始日</Label>
                    <Input
                        id="dateOfDeath"
                        name="dateOfDeath"
                        type="date"
                        value={formData.dateOfDeath}
                        onChange={handleChange}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="acceptanceStatus">受託</Label>
                    <div className="flex h-11 w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                        <select
                            id="acceptanceStatus"
                            name="acceptanceStatus"
                            value={formData.acceptanceStatus || "未判定"}
                            onChange={(e) => {
                                const val = e.target.value as "受託可" | "受託不可" | "未判定" | undefined;
                                setFormData(prev => {
                                    let newStatus = prev.status;
                                    if (val === "未判定") newStatus = "未着手";
                                    else if (val === "受託不可") newStatus = "完了";

                                    return {
                                        ...prev,
                                        acceptanceStatus: val,
                                        status: newStatus
                                    }
                                });
                            }}
                            className="w-full bg-transparent outline-none"
                        >
                            <option value="未判定">未判定</option>
                            <option value="受託可">受託可</option>
                            <option value="受託不可">受託不可</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="status">進行</Label>
                    <div className="flex h-11 w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                        <select
                            id="status"
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="w-full bg-transparent outline-none"
                        >
                            <option value="未着手" disabled={formData.acceptanceStatus === "受託不可"}>未着手</option>
                            <option value="進行中" disabled={formData.acceptanceStatus === "未判定" || formData.acceptanceStatus === "受託不可"}>進行中</option>
                            <option value="完了" disabled={formData.acceptanceStatus === "未判定"}>完了</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="assignee">担当者</Label>
                    <div className="flex h-11 w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                        <select
                            id="assignee"
                            name="assignee"
                            value={formData.assignee}
                            onChange={handleChange}
                            className="w-full bg-transparent outline-none"
                        >
                            <option value="">担当者を選択</option>
                            {assignees.filter(a => a.active !== false).map((a) => (
                                <option key={a.id} value={a.name}>
                                    {a.department ? `${a.department} / ${a.name}` : a.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="text-right text-xs">
                        <a href={`/settings/assignees?returnTo=${isCreateMode ? '/new' : `/${formData.id}`}`} className="text-muted-foreground hover:underline hover:text-primary">
                            担当者を追加・編集
                        </a>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="referrer">紹介者</Label>
                    <div className="flex h-11 w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                        <select
                            id="referrer"
                            name="referrer"
                            value={formData.referrer || ""}
                            onChange={handleChange}
                            className="w-full bg-transparent outline-none"
                        >
                            <option value="">紹介者を選択</option>
                            {referrers.filter(r => r.active !== false).map((r) => {
                                const val = `${r.company} / ${r.name}`;
                                const display = r.department
                                    ? `${r.company} / ${r.department} / ${r.name}`
                                    : `${r.company} / ${r.name}`;
                                return (
                                    <option key={r.id} value={val}>
                                        {display}
                                    </option>
                                )
                            })}
                        </select>
                    </div>
                    <div className="text-right text-xs">
                        <a href={`/settings/referrers?returnTo=${isCreateMode ? '/new' : `/${formData.id}`}`} className="text-muted-foreground hover:underline hover:text-primary">
                            紹介者を追加・編集
                        </a>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="propertyValue">取得財産の価格</Label>
                    <CurrencyInput
                        id="propertyValue"
                        name="propertyValue"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.propertyValue}
                        decimalsLimit={0}
                        onValueChange={(value) => {
                            setFormData((prev) => ({ ...prev, propertyValue: value ? Number(value) : 0 }))
                        }}
                        intlConfig={{ locale: 'ja-JP', currency: 'JPY' }}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="taxAmount">申告納税額</Label>
                    <CurrencyInput
                        id="taxAmount"
                        name="taxAmount"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.taxAmount}
                        decimalsLimit={0}
                        onValueChange={(value) => {
                            setFormData((prev) => ({ ...prev, taxAmount: value ? Number(value) : 0 }))
                        }}
                        intlConfig={{ locale: 'ja-JP', currency: 'JPY' }}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="estimateAmount">見積額（税抜）</Label>
                    <CurrencyInput
                        id="estimateAmount"
                        name="estimateAmount"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.estimateAmount}
                        decimalsLimit={0}
                        onValueChange={(value) => {
                            setFormData((prev) => ({ ...prev, estimateAmount: value ? Number(value) : 0 }))
                        }}
                        intlConfig={{ locale: 'ja-JP', currency: 'JPY' }}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="feeAmount">報酬額（税抜）</Label>
                    <CurrencyInput
                        id="feeAmount"
                        name="feeAmount"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={formData.feeAmount}
                        decimalsLimit={0}
                        onValueChange={(value) => {
                            const newFee = value ? Number(value) : 0;
                            const rate = formData.referralFeeRate || 0;
                            const newReferralAmount = Math.floor(newFee * (rate / 100));

                            setFormData((prev) => ({
                                ...prev,
                                feeAmount: newFee,
                                referralFeeAmount: newReferralAmount
                            }))
                        }}
                        intlConfig={{ locale: 'ja-JP', currency: 'JPY' }}
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
                                    const val = e.target.value;
                                    const rate = val === "" ? undefined : Number(val);

                                    const currentFee = formData.feeAmount || 0;
                                    let newReferralAmount = 0;
                                    if (rate !== undefined) {
                                        newReferralAmount = Math.floor(currentFee * (rate / 100));
                                    }

                                    setFormData((prev) => ({
                                        ...prev,
                                        referralFeeRate: rate,
                                        referralFeeAmount: newReferralAmount
                                    }));
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="referralFeeAmount">紹介料額</Label>
                            <CurrencyInput
                                id="referralFeeAmount"
                                name="referralFeeAmount"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={formData.referralFeeAmount || 0}
                                decimalsLimit={0}
                                onValueChange={(value) => {
                                    // Manual override of amount
                                    setFormData((prev) => ({ ...prev, referralFeeAmount: value ? Number(value) : 0 }));
                                }}
                                intlConfig={{ locale: 'ja-JP', currency: 'JPY' }}
                            />
                        </div>
                    </div>
                    <div className="pt-2 border-t mt-2 space-y-2">
                        <div className="flex justify-between items-end">
                            <Label className="text-base">担当者売上（手取り）</Label>
                            <div className="text-xl font-bold">
                                {new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(
                                    (formData.feeAmount || 0) - (formData.referralFeeAmount || 0)
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground text-right">※ 報酬額（税抜） - 紹介料額</p>

                        <div className="flex justify-between items-end pt-2 border-t border-dashed">
                            <Label className="text-sm text-muted-foreground">（参考）見積ベースの手取り予測</Label>
                            <div className="text-lg font-semibold text-muted-foreground">
                                {new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(
                                    Math.floor((formData.estimateAmount || 0) * (1 - (formData.referralFeeRate || 0) / 100))
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground text-right">※ 見積額 × (1 - 紹介料率)</p>
                    </div>
                </div>


                <div className="space-y-4 col-span-2 border-t pt-6">
                    <div className="flex items-center justify-between">
                        <Label className="text-lg font-semibold">進捗管理</Label>
                    </div>
                    <div className="space-y-4">
                        {formData.progress && formData.progress.map((step, index) => (
                            <div key={step.id} className="grid grid-cols-12 gap-4 items-center p-4 border rounded-lg bg-card/50">
                                <div className="col-span-3">
                                    <Label className="font-medium">{step.name}</Label>
                                </div>
                                <div className="col-span-3">
                                    <Input
                                        type="date"
                                        value={step.date || ""}
                                        onChange={(e) => {
                                            const newProgress = [...(formData.progress || [])];
                                            newProgress[index] = { ...step, date: e.target.value || null };
                                            setFormData(prev => ({ ...prev, progress: newProgress }));
                                        }}
                                    />
                                </div>
                                <div className="col-span-6">
                                    <Input
                                        placeholder="備考（場所、結果など）"
                                        value={step.memo || ""}
                                        onChange={(e) => {
                                            const newProgress = [...(formData.progress || [])];
                                            newProgress[index] = { ...step, memo: e.target.value };
                                            setFormData(prev => ({ ...prev, progress: newProgress }));
                                        }}
                                    />
                                </div>
                                {/* Show add visit button after "2回目訪問" or any dynamic visit, but before "遺産分割" */}
                                {(step.name.includes("回目訪問") || step.name === "2回目訪問") && (
                                    formData.progress && formData.progress[index + 1] && !formData.progress[index + 1].name.includes("回目訪問") && (
                                        <div className="col-span-12 pt-2 text-center">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const newProgress = [...(formData.progress || [])];
                                                    // Find current visit count to increment
                                                    let visitCount = 2;
                                                    newProgress.forEach(p => {
                                                        const match = p.name.match(/(\d+)回目訪問/);
                                                        if (match) {
                                                            const num = parseInt(match[1]);
                                                            if (num > visitCount) visitCount = num;
                                                        }
                                                    });

                                                    const newStep: any = {
                                                        id: `step-visit-${Date.now()}`,
                                                        name: `${visitCount + 1}回目訪問`,
                                                        date: null,
                                                        isDynamic: true
                                                    };

                                                    // Insert after current index
                                                    newProgress.splice(index + 1, 0, newStep);
                                                    setFormData(prev => ({ ...prev, progress: newProgress }));
                                                }}
                                            >
                                                + 訪問日を追加
                                            </Button>
                                        </div>
                                    )
                                )}
                                {/* Delete button for dynamic steps */}
                                {step.isDynamic && (
                                    <div className="col-span-12 flex justify-end -mt-2 mb-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-700 h-8 px-2"
                                            onClick={() => {
                                                if (!confirm("この訪問日時を削除してもよろしいですか？")) return;

                                                const newProgress = [...(formData.progress || [])];
                                                newProgress.splice(index, 1);

                                                // Re-number visits
                                                let visitCounter = 1; // Start counting from 1 (First visit is separate usually but let's assume 2nd starts dynamically or check logic)
                                                // Actually "2回目訪問" is often hardcoded. Let's just find all "N回目訪問" and re-number them sequentially starting from the first one found.

                                                let visitIndex = 0;
                                                newProgress.forEach((p, idx) => {
                                                    if (p.name.includes("回目訪問")) {
                                                        visitIndex++;
                                                        // Adjust name. Assuming the first one found is always "2回目訪問" or we should preserve the 2nd one?
                                                        // The template has "2回目訪問" as static.
                                                        // If we delete a dynamic one, we just need to re-sequence.
                                                        // Let's assume the first "回目訪問" is always "2回目" (as "初回面談" is usually separate).
                                                        // Wait, "初回面談" is step-2. "2回目訪問" is step-3.
                                                        // Let's just re-number all "X回目訪問" starting from 2.
                                                        p.name = `${visitIndex + 1}回目訪問`;
                                                    }
                                                });

                                                setFormData(prev => ({ ...prev, progress: newProgress }));
                                            }}
                                        >
                                            削除
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-4 col-span-2 border-t pt-6">
                    <div className="flex items-center justify-between">
                        <Label className="text-lg font-semibold">連絡先</Label>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setFormData(prev => ({
                                    ...prev,
                                    contacts: [...(prev.contacts || []), { name: "", phone: "", email: "" }]
                                }))
                            }}
                        >
                            + 追加
                        </Button>
                    </div>
                    {formData.contacts && formData.contacts.map((contact, index) => (
                        <div key={index} className="grid grid-cols-3 gap-4 p-4 border rounded-lg relative">
                            <div className="space-y-2">
                                <Label>氏名</Label>
                                <Input
                                    value={contact.name}
                                    onChange={(e) => {
                                        const newContacts = [...formData.contacts];
                                        newContacts[index].name = e.target.value;
                                        setFormData(prev => ({ ...prev, contacts: newContacts }));
                                    }}
                                    placeholder="氏名"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>電話番号</Label>
                                <Input
                                    value={contact.phone}
                                    onChange={(e) => {
                                        const newContacts = [...formData.contacts];
                                        newContacts[index].phone = e.target.value;
                                        setFormData(prev => ({ ...prev, contacts: newContacts }));
                                    }}
                                    placeholder="090-0000-0000"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>メールアドレス</Label>
                                <Input
                                    value={contact.email}
                                    onChange={(e) => {
                                        const newContacts = [...formData.contacts];
                                        newContacts[index].email = e.target.value;
                                        setFormData(prev => ({ ...prev, contacts: newContacts }));
                                    }}
                                    placeholder="example@email.com"
                                />
                            </div>

                            {/* Delete button aligned with Visit Steps style */}
                            {formData.contacts.length > 1 && (
                                <div className="col-span-3 flex justify-end -mt-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-red-500 hover:text-red-700 h-8 px-2"
                                        onClick={() => {
                                            if (!confirm("この連絡先を削除してもよろしいですか？")) return;
                                            setFormData(prev => ({
                                                ...prev,
                                                contacts: prev.contacts.filter((_, i) => i !== index)
                                            }))
                                        }}
                                    >
                                        削除
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                    {(!formData.contacts || formData.contacts.length === 0) && (
                        <div className="text-sm text-muted-foreground">連絡先が登録されていません。</div>
                    )}
                </div>
            </div>

            <div className="sticky bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t mt-4 -mx-6 px-6 shadow-lg z-10 flex justify-end gap-4">
                <Button onClick={handleSave} disabled={isSaving} variant="outline" className="min-w-[120px] font-bold shadow-sm">
                    {isSaving ? "処理中..." : isCreateMode ? "新規登録" : "変更を保存"}
                </Button>
            </div>
        </div >
    )
}
