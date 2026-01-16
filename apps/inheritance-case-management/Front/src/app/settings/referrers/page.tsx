"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { initialReferrers, Referrer } from "@/lib/referrer-data"
import Link from "next/link"
import { Trash2, Plus, Pencil, Check, X, ArrowUpDown, Ban, RotateCcw } from "lucide-react"
import { getReferrers, createReferrer, updateReferrer, deleteReferrer } from "@/lib/referrer-service"
import { useToast } from "@/components/ui/Toast"

type SortField = "company" | "department" | "name"
type SortOrder = "asc" | "desc"

function ReferrerSettingsContent() {
    const router = useRouter()
    const toast = useToast()
    const searchParams = useSearchParams()
    const returnTo = searchParams.get("returnTo")

    // Master state: fetched from server
    const [originalReferrers, setOriginalReferrers] = useState<Referrer[]>([])

    // Working state: local changes
    const [referrers, setReferrers] = useState<Referrer[]>([])
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

    const [newRefCompany, setNewRefCompany] = useState("")
    const [newRefDept, setNewRefDept] = useState("")
    const [newRefName, setNewRefName] = useState("")
    const [newCompanyError, setNewCompanyError] = useState("")
    const [newNameError, setNewNameError] = useState("")

    const [sortField, setSortField] = useState<SortField | null>(null)
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
    const [showInactive, setShowInactive] = useState(true)

    const [editingRefId, setEditingRefId] = useState<string | null>(null)
    const [editingRefCompany, setEditingRefCompany] = useState("")
    const [editingRefDept, setEditingRefDept] = useState("")
    const [editingRefName, setEditingRefName] = useState("")

    const [isSaving, setIsSaving] = useState(false)
    const [isDirty, setIsDirty] = useState(false)

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getReferrers()
                setOriginalReferrers(data)
                setReferrers(data)
            } catch (e) {
                console.error(e)
            }
        }
        load()
    }, [])

    // Check for unsaved changes
    useEffect(() => {
        const isModified = JSON.stringify(originalReferrers) !== JSON.stringify(referrers) || deletedIds.size > 0
        setIsDirty(isModified)

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isModified) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [referrers, originalReferrers, deletedIds])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const promises = []

            // 1. Deletions
            for (const id of deletedIds) {
                if (!id.startsWith("temp_")) {
                    promises.push(deleteReferrer(id))
                }
            }

            // 2. Updates & Creations
            for (const r of referrers) {
                if (r.id.startsWith("temp_")) {
                    // Create new
                    promises.push(createReferrer({
                        company: r.company,
                        department: r.department,
                        name: r.name,
                        active: r.active
                    }))
                } else {
                    // Check if updated
                    const original = originalReferrers.find(orig => orig.id === r.id)
                    if (original && JSON.stringify(original) !== JSON.stringify(r)) {
                        promises.push(updateReferrer(r))
                    }
                }
            }

            await Promise.all(promises)

            // Refresh data
            const newData = await getReferrers()
            setOriginalReferrers(newData)
            setReferrers(newData)
            setDeletedIds(new Set())
            setIsDirty(false)

            router.refresh()
            if (returnTo) {
                router.push(`${returnTo}?saved=referrers`)
            } else {
                toast.success("変更を保存しました")
            }
        } catch (e) {
            console.error(e)
            toast.error("保存中にエラーが発生しました")
        } finally {
            setIsSaving(false)
        }
    }

    const handleAddReferrer = () => {
        let hasError = false
        if (!newRefCompany.trim()) {
            setNewCompanyError("会社名を入力してください")
            hasError = true
        }
        if (!newRefName.trim()) {
            setNewNameError("氏名を入力してください")
            hasError = true
        }

        if (hasError) return

        setNewCompanyError("")
        setNewNameError("")

        const newReferrer: Referrer = {
            id: `temp_${Date.now()}`,
            company: newRefCompany.trim(),
            department: newRefDept.trim(),
            name: newRefName.trim(),
            active: true
        }

        setReferrers([...referrers, newReferrer])
        setNewRefCompany("")
        setNewRefDept("")
        setNewRefName("")
    }

    const handleToggleActive = (id: string) => {
        setReferrers(referrers.map(r => {
            if (r.id === id) {
                return { ...r, active: r.active === false ? true : false }
            }
            return r
        }))
    }

    const handlePermanentDelete = (id: string) => {
        const referrer = referrers.find(r => r.id === id)
        if (!referrer) return

        if (!id.startsWith("temp_") && referrer.active !== false) {
            toast.warning("完全削除するには、まず無効化してください。")
            return
        }

        if (!confirm(`${referrer.company} / ${referrer.name} を一覧から削除しますか？\n（保存ボタンを押すまで確定しません）`)) {
            return
        }

        setReferrers(referrers.filter((r) => r.id !== id))
        if (!id.startsWith("temp_")) {
            const newDeleted = new Set(deletedIds)
            newDeleted.add(id)
            setDeletedIds(newDeleted)
        }
    }

    const handleStartEditReferrer = (r: Referrer) => {
        setEditingRefId(r.id)
        setEditingRefCompany(r.company)
        setEditingRefDept(r.department || "")
        setEditingRefName(r.name)
    }

    const handleSaveEditReferrer = () => {
        if (!editingRefCompany.trim() || !editingRefName.trim() || !editingRefId) return

        setReferrers(referrers.map(r => {
            if (r.id === editingRefId) {
                return {
                    ...r,
                    company: editingRefCompany.trim(),
                    department: editingRefDept.trim(),
                    name: editingRefName.trim()
                }
            }
            return r
        }))
        setEditingRefId(null)
    }

    const handleCancelEditReferrer = () => {
        setEditingRefId(null)
    }

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc")
        } else {
            setSortField(field)
            setSortOrder("asc")
        }
    }

    const filteredAndSortedReferrers = useMemo(() => {
        let filtered = referrers

        // フィルタリング: showInactiveがfalseの場合は有効なもののみ表示
        if (!showInactive) {
            filtered = referrers.filter(r => r.active !== false)
        }

        // ソート
        if (!sortField) return filtered

        return [...filtered].sort((a, b) => {
            let aValue: string = ""
            let bValue: string = ""

            if (sortField === "company") {
                aValue = a.company
                bValue = b.company
            } else if (sortField === "department") {
                aValue = a.department || ""
                bValue = b.department || ""
            } else if (sortField === "name") {
                aValue = a.name
                bValue = b.name
            }

            const comparison = aValue.localeCompare(bValue, "ja")
            return sortOrder === "asc" ? comparison : -comparison
        })
    }, [referrers, sortField, sortOrder, showInactive])

    return (
        <div className="container mx-auto py-10 max-w-2xl relative pb-24">
            <div className="mb-6">
                <Link href={returnTo || "/settings"}>
                    <Button variant="outline">
                        {returnTo ? "前の画面に戻る" : "設定一覧に戻る"}
                    </Button>
                </Link>
                {isDirty && <span className="ml-4 text-sm text-amber-600 font-bold">※ 保存されていない変更があります</span>}
            </div>

            <h1 className="text-2xl font-bold mb-6">紹介者管理</h1>

            <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6 space-y-6">
                <div className="flex items-end gap-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                        <div className="grid gap-1.5">
                            <Label>会社名 (必須)</Label>
                            <Input
                                placeholder="会社名"
                                value={newRefCompany}
                                onChange={(e) => {
                                    setNewRefCompany(e.target.value)
                                    if (newCompanyError) setNewCompanyError("")
                                }}
                                className={newCompanyError ? "border-red-500" : ""}
                            />
                            {newCompanyError && <p className="text-xs text-red-500">{newCompanyError}</p>}
                        </div>
                        <div className="grid gap-1.5">
                            <Label>部署 (任意)</Label>
                            <Input
                                placeholder="部署名"
                                value={newRefDept}
                                onChange={(e) => setNewRefDept(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label>氏名 (必須)</Label>
                            <Input
                                placeholder="氏名"
                                value={newRefName}
                                onChange={(e) => {
                                    setNewRefName(e.target.value)
                                    if (newNameError) setNewNameError("")
                                }}
                                onKeyDown={(e) => e.key === "Enter" && handleAddReferrer()}
                                className={newNameError ? "border-red-500" : ""}
                            />
                            {newNameError && <p className="text-xs text-red-500">{newNameError}</p>}
                        </div>
                    </div>
                    <Button onClick={handleAddReferrer} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        追加
                    </Button>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label>登録済み紹介者</Label>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowInactive(!showInactive)}
                        >
                            {showInactive ? "有効のみ表示" : "すべて表示"}
                        </Button>
                    </div>
                    {referrers.length === 0 ? (
                        <p className="text-muted-foreground text-sm">紹介者が登録されていません。</p>
                    ) : (
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>
                                            <button
                                                onClick={() => handleSort("company")}
                                                className="flex items-center gap-1 hover:text-foreground"
                                            >
                                                会社名
                                                <ArrowUpDown className="h-3 w-3" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="w-[200px]">
                                            <button
                                                onClick={() => handleSort("department")}
                                                className="flex items-center gap-1 hover:text-foreground"
                                            >
                                                部署
                                                <ArrowUpDown className="h-3 w-3" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="w-[200px]">
                                            <button
                                                onClick={() => handleSort("name")}
                                                className="flex items-center gap-1 hover:text-foreground"
                                            >
                                                氏名
                                                <ArrowUpDown className="h-3 w-3" />
                                            </button>
                                        </TableHead>
                                        <TableHead className="w-[100px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAndSortedReferrers.map((ref) => (
                                        <TableRow key={ref.id} className={ref.active === false ? "bg-muted/50" : ""}>
                                            {editingRefId === ref.id ? (
                                                <>
                                                    <TableCell>
                                                        <Input
                                                            value={editingRefCompany}
                                                            onChange={(e) => setEditingRefCompany(e.target.value)}
                                                            placeholder="会社名"
                                                            className="h-9"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            value={editingRefDept}
                                                            onChange={(e) => setEditingRefDept(e.target.value)}
                                                            placeholder="部署"
                                                            className="h-9"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            value={editingRefName}
                                                            onChange={(e) => setEditingRefName(e.target.value)}
                                                            placeholder="氏名"
                                                            className="h-9"
                                                            autoFocus
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                                                                onClick={handleSaveEditReferrer}
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                onClick={handleCancelEditReferrer}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </>
                                            ) : (
                                                <>
                                                    <TableCell className="font-medium">
                                                        {ref.company}
                                                    </TableCell>
                                                    <TableCell>
                                                        {ref.department || "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {ref.name}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                onClick={() => handleStartEditReferrer(ref)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            {ref.active === false ? (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                                                                        onClick={() => handleToggleActive(ref.id)}
                                                                        title="有効化"
                                                                    >
                                                                        <RotateCcw className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                        onClick={() => handlePermanentDelete(ref.id)}
                                                                        title="完全削除"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            ) : (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                                                                    onClick={() => handleToggleActive(ref.id)}
                                                                    title="無効化"
                                                                >
                                                                    <Ban className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </div>

            <div className="sticky bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t mt-4 -mx-6 px-6 shadow-lg z-10 flex justify-end gap-4 rounded-b-lg">
                <Button onClick={handleSave} disabled={isSaving || !isDirty} variant="outline" className={`min-w-[120px] font-bold shadow-sm ${isDirty ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}>
                    {isSaving ? "処理中..." : "変更を保存"}
                </Button>
            </div>
        </div>
    )
}

export default function ReferrerSettingsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ReferrerSettingsContent />
        </Suspense>
    )
}
