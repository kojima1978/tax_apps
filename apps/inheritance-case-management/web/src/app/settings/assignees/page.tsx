"use client"

import { useState, Suspense } from "react"
import { Label } from "@/components/ui/Label"
import { DEPARTMENTS, type Assignee } from "@/types/shared"
import { getAssignees, createAssignee, updateAssignee, deleteAssignee } from "@/lib/api/assignees"
import { useMasterList } from "@/hooks/use-master-list"
import { MasterListPage, type ColumnDef } from "@/components/MasterListPage"
import { useToast } from "@/components/ui/Toast"

const formatEmployeeId = (val: string) => {
    if (!val) return ""
    const num = parseInt(val, 10)
    if (isNaN(num)) return val
    return num.toString().padStart(3, '0')
}

const columns: ColumnDef<Assignee>[] = [
    { key: "employeeId", label: "社員ID", width: "120px", renderCell: (a) => a.employeeId || "-" },
    { key: "department", label: "部署", width: "200px", renderCell: (a) => a.department },
    { key: "name", label: "氏名" },
]

function AssigneeSettingsContent() {
    const toast = useToast()

    const [newId, setNewId] = useState("")
    const [newDept, setNewDept] = useState("")
    const [newName, setNewName] = useState("")
    const [newIdError, setNewIdError] = useState("")
    const [newDeptError, setNewDeptError] = useState("")
    const [newNameError, setNewNameError] = useState("")

    const masterList = useMasterList<Assignee, Parameters<typeof createAssignee>[0], Parameters<typeof updateAssignee>[1]>({
        fetchAll: getAssignees,
        create: createAssignee,
        update: updateAssignee,
        remove: deleteAssignee,
        getCreatePayload: (a) => ({ name: a.name, employeeId: a.employeeId, department: a.department }),
        getUpdatePayload: (a) => ({ name: a.name, employeeId: a.employeeId, department: a.department, active: a.active }),
        entityLabel: "担当者",
        savedParam: "assignees",
        sortFields: ["employeeId", "department", "name"],
        getSortValue: (a, field) => {
            if (field === "employeeId") return a.employeeId || ""
            if (field === "department") return a.department || ""
            return a.name
        },
        getDeleteLabel: (a) => a.name,
    })

    const handleAdd = () => {
        let hasError = false
        if (!newName.trim()) { setNewNameError("氏名を入力してください"); hasError = true }
        if (!newDept.trim()) { setNewDeptError("部署を選択してください"); hasError = true }
        if (newId.trim() !== "") {
            const num = parseInt(newId.trim(), 10)
            if (isNaN(num) || num < 0 || num > 999) { setNewIdError("3桁の整数を入力してください"); hasError = true }
        }
        if (hasError) return

        setNewIdError(""); setNewNameError(""); setNewDeptError("")
        masterList.handleAdd({
            id: `temp_${Date.now()}`,
            name: newName.trim(),
            employeeId: newId.trim() ? formatEmployeeId(newId.trim()) : undefined,
            department: newDept.trim(),
            active: true,
        } as Assignee)
        setNewId(""); setNewDept(""); setNewName("")
    }

    const handleSaveEdit = () => {
        masterList.handleSaveEdit(
            () => {
                if (!masterList.editingFields.name?.trim()) return false
                const eid = masterList.editingFields.employeeId?.trim() || ""
                if (eid !== "") {
                    const num = parseInt(eid, 10)
                    if (isNaN(num) || num < 0 || num > 999) {
                        toast.warning("社員IDは3桁の整数を入力してください")
                        return false
                    }
                }
                return true
            },
            (item) => ({
                ...item,
                name: masterList.editingFields.name.trim(),
                employeeId: masterList.editingFields.employeeId?.trim() ? formatEmployeeId(masterList.editingFields.employeeId.trim()) : undefined,
                department: masterList.editingFields.department?.trim() || "",
            })
        )
    }

    const newItemForm = (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div className="grid gap-1.5">
                <Label htmlFor="new-id">社員ID (任意)</Label>
                <div className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 ${newIdError ? "border-red-500" : "border-input"}`}>
                    <input
                        id="new-id"
                        placeholder="例: 001"
                        value={newId}
                        onChange={(e) => { setNewId(e.target.value); if (newIdError) setNewIdError("") }}
                        onBlur={(e) => setNewId(formatEmployeeId(e.target.value))}
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
                        value={newDept}
                        onChange={(e) => { setNewDept(e.target.value); if (newDeptError) setNewDeptError("") }}
                        className="w-full bg-transparent outline-none"
                    >
                        <option value="">部署を選択</option>
                        {DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                </div>
                {newDeptError && <p className="text-xs text-red-500">{newDeptError}</p>}
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="new-name">氏名 (必須)</Label>
                <div className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 ${newNameError ? "border-red-500" : "border-input"}`}>
                    <input
                        id="new-name"
                        placeholder="氏名を入力"
                        value={newName}
                        onChange={(e) => { setNewName(e.target.value); if (newNameError) setNewNameError("") }}
                        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                        className="w-full bg-transparent outline-none"
                    />
                </div>
                {newNameError && <p className="text-xs text-red-500">{newNameError}</p>}
            </div>
        </div>
    )

    const renderEditCell = (col: ColumnDef<Assignee>) => {
        if (col.key === "employeeId") {
            return (
                <div className="flex h-9 w-full rounded-md border border-input bg-background px-2 ring-offset-background has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 items-center">
                    <input
                        value={masterList.editingFields.employeeId || ""}
                        onChange={(e) => masterList.setEditingFields(prev => ({ ...prev, employeeId: e.target.value }))}
                        onBlur={(e) => masterList.setEditingFields(prev => ({ ...prev, employeeId: formatEmployeeId(e.target.value) }))}
                        className="w-full bg-transparent outline-none text-sm"
                        placeholder="例: 001"
                    />
                </div>
            )
        }
        if (col.key === "department") {
            return (
                <div className="h-9 rounded-md border border-input bg-background px-2 flex items-center">
                    <select
                        value={masterList.editingFields.department || ""}
                        onChange={(e) => masterList.setEditingFields(prev => ({ ...prev, department: e.target.value }))}
                        className="w-full bg-transparent outline-none h-full text-sm"
                    >
                        <option value="">部署を選択</option>
                        {DEPARTMENTS.map((dept) => <option key={dept} value={dept}>{dept}</option>)}
                    </select>
                </div>
            )
        }
        return (
            <div className="flex h-9 w-full rounded-md border border-input bg-background px-2 ring-offset-background has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 items-center">
                <input
                    value={masterList.editingFields.name || ""}
                    onChange={(e) => masterList.setEditingFields(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-transparent outline-none text-sm"
                    autoFocus
                    placeholder="氏名"
                />
            </div>
        )
    }

    return (
        <MasterListPage<Assignee>
            title="担当者管理"
            entityLabel="担当者"
            returnTo={masterList.returnTo}
            isDirty={masterList.isDirty}
            isSaving={masterList.isSaving}
            items={masterList.items}
            filteredItems={masterList.filteredAndSortedItems}
            showInactive={masterList.showInactive}
            onToggleShowInactive={masterList.handleToggleShowInactive}
            editingId={masterList.editingId}
            columns={columns}
            newItemForm={newItemForm}
            onAdd={handleAdd}
            renderEditCell={renderEditCell}
            onStartEdit={(a) => masterList.handleStartEdit(a, { name: a.name, employeeId: a.employeeId || "", department: a.department || "" })}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={masterList.handleCancelEdit}
            onToggleActive={masterList.handleToggleActive}
            onPermanentDelete={masterList.handlePermanentDelete}
            onSave={masterList.handleSave}
            onSort={masterList.handleSort}
        />
    )
}

export default function AssigneeSettingsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AssigneeSettingsContent />
        </Suspense>
    )
}
