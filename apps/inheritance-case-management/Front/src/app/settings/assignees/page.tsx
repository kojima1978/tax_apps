"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Label } from "@/components/ui/Label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { initialAssignees, Assignee, DEPARTMENTS } from "@/lib/assignee-data"
import Link from "next/link"
import { Trash2, Plus, Pencil, Check, X, ArrowUpDown, Ban, RotateCcw } from "lucide-react"
import { getAssignees, createAssignee, updateAssignee, deleteAssignee } from "@/lib/assignee-service"
import { useToast } from "@/components/ui/Toast"

type SortField = "employeeId" | "department" | "name"
type SortOrder = "asc" | "desc"

function AssigneeSettingsContent() {
    const router = useRouter()
    const toast = useToast()
    const searchParams = useSearchParams()
    const returnTo = searchParams.get("returnTo")

    // Master state: fetched from server
    const [originalAssignees, setOriginalAssignees] = useState<Assignee[]>([])

    // Working state: local changes
    const [assignees, setAssignees] = useState<Assignee[]>([])
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

    const [newAssigneeName, setNewAssigneeName] = useState("")
    const [newAssigneeId, setNewAssigneeId] = useState("")
    const [newAssigneeDept, setNewAssigneeDept] = useState("")
    const [newIdError, setNewIdError] = useState("")
    const [newNameError, setNewNameError] = useState("")
    const [newDeptError, setNewDeptError] = useState("")

    const [sortField, setSortField] = useState<SortField | null>(null)
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
    const [showInactive, setShowInactive] = useState(true)

    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingName, setEditingName] = useState("")
    const [editingEmployeeId, setEditingEmployeeId] = useState("")
    const [editingDept, setEditingDept] = useState("")

    const [isSaving, setIsSaving] = useState(false)
    const [isDirty, setIsDirty] = useState(false)

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getAssignees()
                setOriginalAssignees(data)
                setAssignees(data)
            } catch (e) {
                console.error(e)
            }
        }
        load()
    }, [])

    // Check for unsaved changes
    useEffect(() => {
        const isModified = JSON.stringify(originalAssignees) !== JSON.stringify(assignees) || deletedIds.size > 0
        setIsDirty(isModified)

        // Simple prevention of accidental navigation (browser level)
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isModified) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [assignees, originalAssignees, deletedIds])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const promises = []

            // 1. Deletions
            for (const id of deletedIds) {
                if (!id.startsWith("temp_")) {
                    promises.push(deleteAssignee(id))
                }
            }

            // 2. Updates & Creations
            for (const assignee of assignees) {
                if (assignee.id.startsWith("temp_")) {
                    // Create new
                    promises.push(createAssignee({
                        name: assignee.name,
                        employeeId: assignee.employeeId,
                        department: assignee.department,
                        active: assignee.active
                    }))
                } else {
                    // Check if updated
                    const original = originalAssignees.find(a => a.id === assignee.id)
                    if (original && JSON.stringify(original) !== JSON.stringify(assignee)) {
                        promises.push(updateAssignee(assignee))
                    }
                }
            }

            await Promise.all(promises)

            // Refresh data
            const newData = await getAssignees()
            setOriginalAssignees(newData)
            setAssignees(newData)
            setDeletedIds(new Set())
            setIsDirty(false)

            router.refresh()
            if (returnTo) {
                router.push(`${returnTo}?saved=assignees`)
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

    const handleAdd = () => {
        let hasError = false
        if (!newAssigneeName.trim()) {
            setNewNameError("氏名を入力してください")
            hasError = true
        }
        if (!newAssigneeDept.trim()) {
            setNewDeptError("部署を選択してください")
            hasError = true
        }

        if (newAssigneeId.trim() !== "") {
            const num = parseInt(newAssigneeId.trim(), 10)
            if (isNaN(num) || num < 0 || num > 999) {
                setNewIdError("3桁の整数を入力してください")
                hasError = true
            }
        }

        if (hasError) return

        setNewIdError("")
        setNewNameError("")
        setNewDeptError("")

        const newAssignee: Assignee = {
            id: `temp_${Date.now()}`,
            name: newAssigneeName.trim(),
            employeeId: newAssigneeId.trim() ? formatEmployeeId(newAssigneeId.trim()) : undefined,
            department: newAssigneeDept.trim(),
            active: true
        }

        setAssignees([...assignees, newAssignee])
        setNewAssigneeName("")
        setNewAssigneeId("")
        setNewAssigneeDept("")
    }

    const handleToggleActive = (id: string) => {
        setAssignees(assignees.map(a => {
            if (a.id === id) {
                return { ...a, active: a.active === false ? true : false }
            }
            return a
        }))
    }

    const handlePermanentDelete = (id: string) => {
        const assignee = assignees.find(a => a.id === id)
        if (!assignee) return



        if (!id.startsWith("temp_") && assignee.active !== false) {
            toast.warning("完全削除するには、まず無効化してください。")
            return
        }


        if (!confirm(`${assignee.name} を一覧から削除しますか？\n（保存ボタンを押すまで確定しません）`)) {
            return
        }

        setAssignees(assignees.filter((a) => a.id !== id))
        if (!id.startsWith("temp_")) {
            const newDeleted = new Set(deletedIds)
            newDeleted.add(id)
            setDeletedIds(newDeleted)
        }
    }

    const handleStartEdit = (assignee: Assignee) => {
        setEditingId(assignee.id)
        setEditingName(assignee.name)
        setEditingEmployeeId(assignee.employeeId || "")
        setEditingDept(assignee.department || "")
    }

    const handleSaveEdit = () => {
        if (!editingName.trim() || !editingId) return

        if (editingEmployeeId.trim() !== "") {
            const num = parseInt(editingEmployeeId.trim(), 10)
            if (isNaN(num) || num < 0 || num > 999) {
                toast.warning("社員IDは3桁の整数を入力してください")
                return
            }
        }

        setAssignees(assignees.map(a => {
            if (a.id === editingId) {
                return {
                    ...a,
                    name: editingName.trim(),
                    employeeId: editingEmployeeId.trim() ? formatEmployeeId(editingEmployeeId.trim()) : undefined,
                    department: editingDept.trim()
                }
            }
            return a
        }))

        setEditingId(null)
        setEditingName("")
        setEditingEmployeeId("")
        setEditingDept("")
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setEditingName("")
        setEditingEmployeeId("")
        setEditingDept("")
    }

    const formatEmployeeId = (val: string) => {
        if (!val) return ""
        const num = parseInt(val, 10)
        if (isNaN(num)) return val
        return num.toString().padStart(3, '0')
    }

    const handleIdBlur = (
        val: string,
        setter: (v: string) => void
    ) => {
        setter(formatEmployeeId(val))
    }

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc")
        } else {
            setSortField(field)
            setSortOrder("asc")
        }
    }

    const filteredAndSortedAssignees = useMemo(() => {
        let filtered = assignees

        // フィルタリング: showInactiveがfalseの場合は有効なもののみ表示
        if (!showInactive) {
            filtered = assignees.filter(a => a.active !== false)
        }

        // ソート
        if (!sortField) return filtered

        return [...filtered].sort((a, b) => {
            let aValue: string = ""
            let bValue: string = ""

            if (sortField === "employeeId") {
                aValue = a.employeeId || ""
                bValue = b.employeeId || ""
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
    }, [assignees, sortField, sortOrder, showInactive])

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

            <h1 className="text-2xl font-bold mb-6">担当者管理</h1>

            <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6 space-y-6">
                <div className="flex items-end gap-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                        <div className="grid gap-1.5">
                            <Label htmlFor="new-id">社員ID (任意)</Label>
                            <div className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 ${newIdError ? "border-red-500" : "border-input"}`}>
                                <input
                                    id="new-id"
                                    placeholder="例: 001"
                                    value={newAssigneeId}
                                    onChange={(e) => {
                                        setNewAssigneeId(e.target.value)
                                        if (newIdError) setNewIdError("")
                                    }}
                                    onBlur={(e) => handleIdBlur(e.target.value, setNewAssigneeId)}
                                    className="w-full bg-transparent outline-none"
                                />
                            </div>
                            {newIdError && <p className="text-xs text-red-500">{newIdError}</p>}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="new-dept">部署 (必須)</Label>
                            <div className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 ${newDeptError ? "border-red-500" : "border-input"}`}>
                                <select
                                    id="new-dept"
                                    value={newAssigneeDept}
                                    onChange={(e) => {
                                        setNewAssigneeDept(e.target.value)
                                        if (newDeptError) setNewDeptError("")
                                    }}
                                    className="w-full bg-transparent outline-none"
                                >
                                    <option value="">部署を選択</option>
                                    {DEPARTMENTS.map((dept) => (
                                        <option key={dept} value={dept}>
                                            {dept}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {newDeptError && <p className="text-xs text-red-500">{newDeptError}</p>}
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="new-assignee">氏名 (必須)</Label>
                            <div className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 ${newNameError ? "border-red-500" : "border-input"}`}>
                                <input
                                    id="new-assignee"
                                    placeholder="氏名を入力"
                                    value={newAssigneeName}
                                    onChange={(e) => {
                                        setNewAssigneeName(e.target.value)
                                        if (newNameError) setNewNameError("")
                                    }}
                                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                                    className="w-full bg-transparent outline-none"
                                />
                            </div>
                            {newNameError && <p className="text-xs text-red-500">{newNameError}</p>}
                        </div>
                    </div>
                    <Button onClick={handleAdd} variant="outline">
                        <Plus className="h-4 w-4 mr-2" />
                        追加
                    </Button>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label>登録済み担当者</Label>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowInactive(!showInactive)}
                        >
                            {showInactive ? "有効のみ表示" : "すべて表示"}
                        </Button>
                    </div>
                    {assignees.length === 0 ? (
                        <p className="text-muted-foreground text-sm">担当者が登録されていません。</p>
                    ) : (
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[120px]">
                                            <button
                                                onClick={() => handleSort("employeeId")}
                                                className="flex items-center gap-1 hover:text-foreground"
                                            >
                                                社員ID
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
                                        <TableHead>
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
                                    {filteredAndSortedAssignees.map((assignee) => (
                                        <TableRow key={assignee.id} className={assignee.active === false ? "bg-muted/50" : ""}>
                                            {editingId === assignee.id ? (
                                                <>
                                                    <TableCell>
                                                        <div className="flex h-9 w-full rounded-md border border-input bg-background px-2 ring-offset-background has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 items-center">
                                                            <input
                                                                value={editingEmployeeId}
                                                                onChange={(e) => setEditingEmployeeId(e.target.value)}
                                                                onBlur={(e) => handleIdBlur(e.target.value, setEditingEmployeeId)}
                                                                className="w-full bg-transparent outline-none text-sm"
                                                                placeholder="例: 001"
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="h-9 rounded-md border border-input bg-background px-2 flex items-center">
                                                            <select
                                                                value={editingDept}
                                                                onChange={(e) => setEditingDept(e.target.value)}
                                                                className="w-full bg-transparent outline-none h-full text-sm"
                                                            >
                                                                <option value="">部署を選択</option>
                                                                {DEPARTMENTS.map((dept) => (
                                                                    <option key={dept} value={dept}>
                                                                        {dept}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex h-9 w-full rounded-md border border-input bg-background px-2 ring-offset-background has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 items-center">
                                                            <input
                                                                value={editingName}
                                                                onChange={(e) => setEditingName(e.target.value)}
                                                                className="w-full bg-transparent outline-none text-sm"
                                                                autoFocus
                                                                placeholder="氏名"
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                                                                onClick={handleSaveEdit}
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                onClick={handleCancelEdit}
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </>
                                            ) : (
                                                <>
                                                    <TableCell className="font-medium">
                                                        {assignee.employeeId || "-"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {assignee.department}
                                                    </TableCell>
                                                    <TableCell>
                                                        {assignee.name}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                onClick={() => handleStartEdit(assignee)}
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            {assignee.active === false ? (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                                                                        onClick={() => handleToggleActive(assignee.id)}
                                                                        title="有効化"
                                                                    >
                                                                        <RotateCcw className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                        onClick={() => handlePermanentDelete(assignee.id)}
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
                                                                    onClick={() => handleToggleActive(assignee.id)}
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

export default function AssigneeSettingsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AssigneeSettingsContent />
        </Suspense>
    )
}
