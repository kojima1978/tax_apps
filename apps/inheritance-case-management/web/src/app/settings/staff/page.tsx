"use client"

import { useState, useEffect, useCallback, useMemo, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { SelectField } from "@/components/ui/SelectField"
import { useToast } from "@/components/ui/Toast"
import type { Department, Assignee } from "@/types/shared"
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from "@/lib/api/departments"
import { getAssignees, createAssignee, updateAssignee, deleteAssignee } from "@/lib/api/assignees"
import {
    ChevronRight, ChevronDown, Users, Plus, Trash2, Pencil, Check, X, Building2, Ban, RotateCcw, ChevronsUpDown,
} from "lucide-react"

const formatEmployeeId = (val: string) => {
    if (!val) return ""
    const num = parseInt(val, 10)
    if (isNaN(num)) return val
    return num.toString().padStart(3, "0")
}

type EditingAssignee = { id: number; name: string; employeeId: string; departmentId: string }

function StaffContent() {
    const toast = useToast()
    const searchParams = useSearchParams()
    const returnTo = searchParams.get("returnTo")

    const [departments, setDepartments] = useState<Department[]>([])
    const [assignees, setAssignees] = useState<Assignee[]>([])
    const [loading, setLoading] = useState(true)
    const [showInactive, setShowInactive] = useState(false)

    const [addingDept, setAddingDept] = useState(false)
    const [newDeptName, setNewDeptName] = useState("")

    const [editingDeptId, setEditingDeptId] = useState<number | null>(null)
    const [editDeptName, setEditDeptName] = useState("")

    const [addingAssigneeForDept, setAddingAssigneeForDept] = useState<number | "none" | null>(null)
    const [newAssignee, setNewAssignee] = useState({ name: "", employeeId: "" })

    const [editingAssignee, setEditingAssignee] = useState<EditingAssignee | null>(null)

    const [filterDept, setFilterDept] = useState<string>("")
    const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set())

    const reload = useCallback(async () => {
        try {
            const [d, a] = await Promise.all([getDepartments(), getAssignees()])
            setDepartments(d.sort((a, b) => a.sortOrder - b.sortOrder))
            setAssignees(a)
        } catch {
            toast.error("データの取得に失敗しました")
        } finally {
            setLoading(false)
        }
    }, [toast])

    useEffect(() => { reload() }, [reload])

    const activeDepts = useMemo(() => departments.filter(d => d.active), [departments])

    const groupedAssignees = useMemo(() => {
        const filtered = showInactive ? assignees : assignees.filter(a => a.active)
        const deptFiltered = filterDept
            ? filtered.filter(a => (filterDept === "none" ? !a.departmentId : a.departmentId === Number(filterDept)))
            : filtered

        const groups: { dept: Department | null; members: Assignee[] }[] = []
        const deptOrder = filterDept
            ? (filterDept === "none" ? [null] : activeDepts.filter(d => d.id === Number(filterDept)))
            : [...activeDepts, null]

        for (const dept of deptOrder) {
            const deptObj = dept && typeof dept === "object" ? dept : null
            const members = deptFiltered
                .filter(a => deptObj ? a.departmentId === deptObj.id : !a.departmentId)
                .sort((a, b) => (a.employeeId || "999").localeCompare(b.employeeId || "999") || a.name.localeCompare(b.name))
            if (members.length > 0 || (deptObj && !filterDept)) {
                groups.push({ dept: deptObj, members })
            }
        }
        return groups
    }, [assignees, departments, activeDepts, showInactive, filterDept])

    const toggleDeptExpanded = useCallback((key: string) => {
        setExpandedDepts(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }, [])

    const expandAll = useCallback(() => {
        setExpandedDepts(new Set(groupedAssignees.map(({ dept }) => dept ? String(dept.id) : "none")))
    }, [groupedAssignees])

    const collapseAll = useCallback(() => {
        setExpandedDepts(new Set())
    }, [])

    const allExpanded = groupedAssignees.length > 0 && groupedAssignees.every(({ dept }) => expandedDepts.has(dept ? String(dept.id) : "none"))

    const handleAddDept = async () => {
        const name = newDeptName.trim()
        if (!name) return
        try {
            const maxOrder = departments.reduce((max, d) => Math.max(max, d.sortOrder), 0)
            await createDepartment({ name, sortOrder: maxOrder + 1 })
            setNewDeptName("")
            setAddingDept(false)
            await reload()
            toast.success(`${name} を追加しました`)
        } catch {
            toast.error("部署の追加に失敗しました")
        }
    }

    const handleSaveDeptEdit = async () => {
        if (editingDeptId === null) return
        const name = editDeptName.trim()
        if (!name) return
        try {
            const dept = departments.find(d => d.id === editingDeptId)
            if (dept) await updateDepartment(editingDeptId, { name, sortOrder: dept.sortOrder })
            setEditingDeptId(null)
            await reload()
            toast.success("部署名を更新しました")
        } catch {
            toast.error("更新に失敗しました")
        }
    }

    const handleDeleteDept = async (dept: Department) => {
        const membersInDept = assignees.filter(a => a.departmentId === dept.id)
        if (membersInDept.length > 0) {
            toast.error(`${dept.name} には担当者が所属しています。先に担当者を移動・削除してください。`)
            return
        }
        if (!confirm(`「${dept.name}」を削除しますか？`)) return
        try {
            await deleteDepartment(dept.id)
            await reload()
            toast.success(`${dept.name} を削除しました`)
        } catch {
            toast.error("削除に失敗しました")
        }
    }

    const handleAddAssignee = async (deptId: number | null) => {
        const name = newAssignee.name.trim()
        if (!name) { toast.warning("氏名を入力してください"); return }
        const eid = newAssignee.employeeId.trim()
        if (eid) {
            const num = parseInt(eid, 10)
            if (isNaN(num) || num < 0 || num > 999) { toast.warning("社員IDは3桁の整数を入力してください"); return }
        }
        try {
            await createAssignee({
                name,
                employeeId: eid ? formatEmployeeId(eid) : undefined,
                departmentId: deptId,
            })
            setNewAssignee({ name: "", employeeId: "" })
            setAddingAssigneeForDept(null)
            await reload()
            toast.success(`${name} を追加しました`)
        } catch {
            toast.error("担当者の追加に失敗しました")
        }
    }

    const handleStartEditAssignee = (a: Assignee) => {
        setEditingAssignee({
            id: a.id,
            name: a.name,
            employeeId: a.employeeId || "",
            departmentId: a.departmentId ? String(a.departmentId) : "",
        })
    }

    const handleSaveAssigneeEdit = async () => {
        if (!editingAssignee) return
        const name = editingAssignee.name.trim()
        if (!name) { toast.warning("氏名を入力してください"); return }
        const eid = editingAssignee.employeeId.trim()
        if (eid) {
            const num = parseInt(eid, 10)
            if (isNaN(num) || num < 0 || num > 999) { toast.warning("社員IDは3桁の整数を入力してください"); return }
        }
        try {
            const deptId = editingAssignee.departmentId ? parseInt(editingAssignee.departmentId, 10) : null
            await updateAssignee(editingAssignee.id, {
                name,
                employeeId: eid ? formatEmployeeId(eid) : undefined,
                departmentId: deptId,
            })
            setEditingAssignee(null)
            await reload()
            toast.success("更新しました")
        } catch {
            toast.error("更新に失敗しました")
        }
    }

    const handleToggleActive = async (a: Assignee) => {
        try {
            await updateAssignee(a.id, {
                name: a.name,
                employeeId: a.employeeId,
                departmentId: a.departmentId ?? null,
                active: !a.active,
            })
            await reload()
            toast.success(a.active ? `${a.name} を無効化しました` : `${a.name} を有効化しました`)
        } catch {
            toast.error("更新に失敗しました")
        }
    }

    const handleDeleteAssignee = async (a: Assignee) => {
        if (!confirm(`「${a.name}」を完全に削除しますか？`)) return
        try {
            await deleteAssignee(a.id)
            await reload()
            toast.success(`${a.name} を削除しました`)
        } catch {
            toast.error("削除に失敗しました。案件で使用中の可能性があります。")
        }
    }

    if (loading) {
        return <div className="container mx-auto py-10 max-w-3xl px-4"><p className="text-muted-foreground">読み込み中...</p></div>
    }

    return (
        <div className="container mx-auto py-10 max-w-3xl px-4">
            <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                <Link href="/" className="hover:text-foreground transition-colors">案件一覧</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                {returnTo ? (
                    <>
                        <Link href={returnTo} className="hover:text-foreground transition-colors">前の画面</Link>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </>
                ) : (
                    <>
                        <Link href="/settings" className="hover:text-foreground transition-colors">設定</Link>
                        <ChevronRight className="h-3.5 w-3.5" />
                    </>
                )}
                <span className="text-foreground font-medium">担当者管理</span>
            </nav>

            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-lg bg-blue-100 text-blue-600">
                    <Users className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold">担当者管理</h1>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
                <SelectField
                    value={filterDept}
                    onChange={e => setFilterDept(e.target.value)}
                    className="w-48 h-9 text-sm"
                >
                    <option value="">すべての部署</option>
                    {activeDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    <option value="none">部署なし</option>
                </SelectField>

                <Button variant="outline" size="sm" onClick={() => setShowInactive(!showInactive)}>
                    {showInactive ? "有効のみ表示" : "すべて表示"}
                </Button>

                <Button variant="outline" size="sm" onClick={allExpanded ? collapseAll : expandAll}>
                    <ChevronsUpDown className="h-3.5 w-3.5 mr-1" />
                    {allExpanded ? "全て閉じる" : "全て開く"}
                </Button>

                <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setAddingDept(true); setAddingAssigneeForDept(null) }}>
                        <Plus className="h-3.5 w-3.5 mr-1" />部署追加
                    </Button>
                </div>
            </div>

            {/* Add department inline */}
            {addingDept && (
                <div className="flex items-center gap-2 mb-4 p-3 border rounded-lg bg-card">
                    <Building2 className="h-4 w-4 text-purple-600 shrink-0" />
                    <Input
                        value={newDeptName}
                        onChange={e => setNewDeptName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleAddDept()}
                        placeholder="新しい部署名"
                        className="h-9 text-sm max-w-xs"
                        autoFocus
                    />
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600" onClick={handleAddDept}>
                        <Check className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setAddingDept(false); setNewDeptName("") }}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Grouped list */}
            <div className="space-y-4">
                {groupedAssignees.map(({ dept, members }) => {
                    const deptKey = dept ? `dept-${dept.id}` : "no-dept"
                    const isEditingDept = editingDeptId !== null && dept?.id === editingDeptId
                    const addKey = dept ? dept.id : "none"
                    const expandKey = dept ? String(dept.id) : "none"
                    const isExpanded = expandedDepts.has(expandKey)

                    return (
                        <div key={deptKey} className="border rounded-lg bg-card overflow-hidden">
                            {/* Department header */}
                            <div className={`group flex items-center gap-2 px-4 py-2.5 bg-muted/40 ${isExpanded ? "border-b" : ""}`}>
                                <button
                                    className="flex items-center gap-2 flex-1 min-w-0"
                                    onClick={() => toggleDeptExpanded(expandKey)}
                                >
                                    <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`} />
                                    <Building2 className="h-4 w-4 text-purple-600 shrink-0" />
                                    {isEditingDept ? (
                                        <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
                                            <Input
                                                value={editDeptName}
                                                onChange={e => setEditDeptName(e.target.value)}
                                                onKeyDown={e => { if (e.key === "Enter") handleSaveDeptEdit(); if (e.key === "Escape") setEditingDeptId(null) }}
                                                className="h-8 text-sm max-w-xs"
                                                autoFocus
                                            />
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={handleSaveDeptEdit}>
                                                <Check className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingDeptId(null)}>
                                                <X className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <span className="text-sm font-semibold truncate">{dept?.name || "部署なし"}</span>
                                    )}
                                </button>
                                <span className="text-xs text-muted-foreground shrink-0">{members.length}名</span>
                                {dept && !isEditingDept && (
                                    <div className="hidden group-hover:flex items-center gap-0.5 ml-1 shrink-0" onClick={e => e.stopPropagation()}>
                                        <button className="p-1 rounded hover:bg-muted" onClick={() => { setEditingDeptId(dept.id); setEditDeptName(dept.name) }}>
                                            <Pencil className="h-3 w-3 text-muted-foreground" />
                                        </button>
                                        <button className="p-1 rounded hover:bg-destructive/10" onClick={() => handleDeleteDept(dept)}>
                                            <Trash2 className="h-3 w-3 text-destructive" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Assignee rows (collapsible) */}
                            {isExpanded && <div className="divide-y">
                                {members.map(a => (
                                    <div key={a.id} className={`group flex items-center gap-3 px-4 py-2 ${a.active === false ? "bg-muted/50 opacity-60" : "hover:bg-muted/20"}`}>
                                        {editingAssignee?.id === a.id ? (
                                            <div className="flex items-center gap-2 flex-1 flex-wrap">
                                                <Input
                                                    value={editingAssignee.employeeId}
                                                    onChange={e => setEditingAssignee(prev => prev && { ...prev, employeeId: e.target.value })}
                                                    onBlur={e => setEditingAssignee(prev => prev && { ...prev, employeeId: formatEmployeeId(e.target.value) })}
                                                    placeholder="社員ID"
                                                    className="h-8 text-sm w-20"
                                                />
                                                <SelectField
                                                    value={editingAssignee.departmentId}
                                                    onChange={e => setEditingAssignee(prev => prev && { ...prev, departmentId: e.target.value })}
                                                    className="h-8 text-sm w-36"
                                                >
                                                    <option value="">部署なし</option>
                                                    {activeDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                                </SelectField>
                                                <Input
                                                    value={editingAssignee.name}
                                                    onChange={e => setEditingAssignee(prev => prev && { ...prev, name: e.target.value })}
                                                    onKeyDown={e => { if (e.key === "Enter") handleSaveAssigneeEdit(); if (e.key === "Escape") setEditingAssignee(null) }}
                                                    placeholder="氏名"
                                                    className="h-8 text-sm flex-1 min-w-[100px]"
                                                    autoFocus
                                                />
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={handleSaveAssigneeEdit}>
                                                    <Check className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingAssignee(null)}>
                                                    <X className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="text-xs text-muted-foreground w-12 shrink-0 font-mono">{a.employeeId || "-"}</span>
                                                <span className="text-sm flex-1 font-medium">{a.name}</span>
                                                <div className="hidden group-hover:flex items-center gap-0.5">
                                                    <button className="p-1 rounded hover:bg-muted" onClick={() => handleStartEditAssignee(a)}>
                                                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                                    </button>
                                                    {a.active === false ? (
                                                        <>
                                                            <button className="p-1 rounded hover:bg-green-100" onClick={() => handleToggleActive(a)} title="有効化">
                                                                <RotateCcw className="h-3.5 w-3.5 text-green-600" />
                                                            </button>
                                                            <button className="p-1 rounded hover:bg-destructive/10" onClick={() => handleDeleteAssignee(a)} title="完全削除">
                                                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button className="p-1 rounded hover:bg-orange-100" onClick={() => handleToggleActive(a)} title="無効化">
                                                            <Ban className="h-3.5 w-3.5 text-orange-600" />
                                                        </button>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}

                            </div>}

                            {/* Add assignee (always visible) */}
                            {addingAssigneeForDept === addKey ? (
                                <div className="flex items-center gap-2 px-4 py-2 bg-muted/10 border-t">
                                    <Input
                                        value={newAssignee.employeeId}
                                        onChange={e => setNewAssignee(prev => ({ ...prev, employeeId: e.target.value }))}
                                        onBlur={e => setNewAssignee(prev => ({ ...prev, employeeId: formatEmployeeId(e.target.value) }))}
                                        placeholder="社員ID"
                                        className="h-8 text-sm w-20"
                                    />
                                    <Input
                                        value={newAssignee.name}
                                        onChange={e => setNewAssignee(prev => ({ ...prev, name: e.target.value }))}
                                        onKeyDown={e => e.key === "Enter" && handleAddAssignee(dept?.id ?? null)}
                                        placeholder="氏名"
                                        className="h-8 text-sm flex-1"
                                        autoFocus
                                    />
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" onClick={() => handleAddAssignee(dept?.id ?? null)}>
                                        <Check className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setAddingAssigneeForDept(null); setNewAssignee({ name: "", employeeId: "" }) }}>
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ) : (
                                <button
                                    className={`flex items-center gap-1.5 px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors w-full ${isExpanded ? "border-t" : ""}`}
                                    onClick={() => { setAddingAssigneeForDept(addKey); setAddingDept(false); setNewAssignee({ name: "", employeeId: "" }); if (!isExpanded) toggleDeptExpanded(expandKey) }}
                                >
                                    <Plus className="h-3 w-3" />
                                    担当者を追加
                                </button>
                            )}
                        </div>
                    )
                })}

                {groupedAssignees.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">該当する担当者がいません</p>
                )}
            </div>
        </div>
    )
}

export default function StaffPage() {
    return (
        <Suspense fallback={<div className="container mx-auto py-10 px-4"><p className="text-muted-foreground">読み込み中...</p></div>}>
            <StaffContent />
        </Suspense>
    )
}
