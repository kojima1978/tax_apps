"use client"

import { useState, useEffect, useCallback, useMemo, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { MasterBreadcrumb } from "@/components/master-list/MasterBreadcrumb"
import { useToast } from "@/components/ui/Toast"
import type { Department, Assignee } from "@/types/shared"
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from "@/lib/api/departments"
import { getAssignees, createAssignee, updateAssignee, deleteAssignee } from "@/lib/api/assignees"
import { Users } from "lucide-react"
import { AddDepartmentForm } from "./AddDepartmentForm"
import { StaffGroupList } from "./StaffGroupList"
import { StaffToolbar } from "./StaffToolbar"
import {
    formatEmployeeId,
    getGroupedAssignees,
    isValidEmployeeId,
    type EditingAssignee,
    type NewAssigneeDraft,
} from "./staff-utils"

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
    const [newAssignee, setNewAssignee] = useState<NewAssigneeDraft>({ name: "", employeeId: "" })

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
        return getGroupedAssignees({ assignees, activeDepts, showInactive, filterDept })
    }, [assignees, activeDepts, showInactive, filterDept])

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
        if (!isValidEmployeeId(eid)) {
            toast.warning("社員IDは3桁の整数を入力してください")
            return
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
        if (!isValidEmployeeId(eid)) {
            toast.warning("社員IDは3桁の整数を入力してください")
            return
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
            <MasterBreadcrumb returnTo={returnTo} title="担当者管理" />

            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-lg bg-white text-black border border-black/10">
                    <Users className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold">担当者管理</h1>
            </div>

            <StaffToolbar
                activeDepts={activeDepts}
                filterDept={filterDept}
                showInactive={showInactive}
                allExpanded={allExpanded}
                onFilterDeptChange={setFilterDept}
                onToggleShowInactive={() => setShowInactive(prev => !prev)}
                onToggleExpandAll={allExpanded ? collapseAll : expandAll}
                onStartAddDepartment={() => {
                    setAddingDept(true)
                    setAddingAssigneeForDept(null)
                }}
            />

            {addingDept && (
                <AddDepartmentForm
                    name={newDeptName}
                    onNameChange={setNewDeptName}
                    onSave={handleAddDept}
                    onCancel={() => {
                        setAddingDept(false)
                        setNewDeptName("")
                    }}
                />
            )}

            <StaffGroupList
                groups={groupedAssignees}
                activeDepts={activeDepts}
                expandedDepts={expandedDepts}
                editingDeptId={editingDeptId}
                editDeptName={editDeptName}
                addingAssigneeForDept={addingAssigneeForDept}
                newAssignee={newAssignee}
                editingAssignee={editingAssignee}
                onToggleDeptExpanded={toggleDeptExpanded}
                onEditDeptNameChange={setEditDeptName}
                onStartEditDept={(dept) => {
                    setEditingDeptId(dept.id)
                    setEditDeptName(dept.name)
                }}
                onCancelEditDept={() => setEditingDeptId(null)}
                onSaveDeptEdit={handleSaveDeptEdit}
                onDeleteDept={handleDeleteDept}
                onSetAddingAssigneeForDept={setAddingAssigneeForDept}
                onSetAddingDept={setAddingDept}
                onNewAssigneeChange={setNewAssignee}
                onAddAssignee={handleAddAssignee}
                onEditingAssigneeChange={setEditingAssignee}
                onStartEditAssignee={handleStartEditAssignee}
                onSaveAssigneeEdit={handleSaveAssigneeEdit}
                onToggleAssigneeActive={handleToggleActive}
                onDeleteAssignee={handleDeleteAssignee}
            />
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
