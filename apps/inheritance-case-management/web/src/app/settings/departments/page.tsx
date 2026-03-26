"use client"

import { useState, Suspense } from "react"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import type { Department } from "@/types/shared"
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from "@/lib/api/departments"
import { useMasterList, nextTempId } from "@/hooks/use-master-list"
import { MasterListPage, getMasterListPageProps, type ColumnDef } from "@/components/MasterListPage"

const columns: ColumnDef<Department>[] = [
    { key: "sortOrder", label: "表示順", width: "100px", renderCell: (d) => d.sortOrder },
    { key: "name", label: "部署名" },
]

function DepartmentSettingsContent() {
    const [newName, setNewName] = useState("")
    const [newOrder, setNewOrder] = useState("")
    const [newNameError, setNewNameError] = useState("")

    const masterList = useMasterList<Department, Parameters<typeof createDepartment>[0], Parameters<typeof updateDepartment>[1]>({
        fetchAll: getDepartments,
        create: createDepartment,
        update: updateDepartment,
        remove: deleteDepartment,
        getCreatePayload: (d) => ({ name: d.name, sortOrder: d.sortOrder }),
        getUpdatePayload: (d) => ({ name: d.name, sortOrder: d.sortOrder, active: d.active }),
        entityLabel: "部署",
        savedParam: "departments",
        sortFields: ["sortOrder", "name"],
        getSortValue: (d, field) => {
            if (field === "sortOrder") return String(d.sortOrder).padStart(5, '0')
            return d.name
        },
        getDeleteLabel: (d) => d.name,
    })

    const handleAdd = () => {
        if (!newName.trim()) { setNewNameError("部署名を入力してください"); return }
        setNewNameError("")

        const maxOrder = masterList.items.reduce((max, d) => Math.max(max, d.sortOrder), 0)
        masterList.handleAdd({
            id: nextTempId(),
            name: newName.trim(),
            sortOrder: newOrder.trim() ? parseInt(newOrder.trim(), 10) || 0 : maxOrder + 1,
            active: true,
        } as Department)
        setNewName(""); setNewOrder("")
    }

    const handleSaveEdit = () => {
        masterList.handleSaveEdit(
            () => !!masterList.editingFields.name?.trim(),
            (item) => ({
                ...item,
                name: masterList.editingFields.name.trim(),
                sortOrder: parseInt(masterList.editingFields.sortOrder || "0", 10) || 0,
            })
        )
    }

    const newItemForm = (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <div className="grid gap-1.5">
                <Label htmlFor="new-name">部署名 (必須)</Label>
                <Input
                    id="new-name"
                    placeholder="部署名を入力"
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); if (newNameError) setNewNameError("") }}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    className={newNameError ? "border-red-500" : ""}
                />
                {newNameError && <p className="text-xs text-red-500">{newNameError}</p>}
            </div>
            <div className="grid gap-1.5">
                <Label htmlFor="new-order">表示順 (任意)</Label>
                <Input
                    id="new-order"
                    type="number"
                    placeholder="自動採番"
                    value={newOrder}
                    onChange={(e) => setNewOrder(e.target.value)}
                />
            </div>
        </div>
    )

    const renderEditCell = (col: ColumnDef<Department>) => {
        if (col.key === "sortOrder") {
            return (
                <Input
                    type="number"
                    value={masterList.editingFields.sortOrder || ""}
                    onChange={(e) => masterList.setEditingFields(prev => ({ ...prev, sortOrder: e.target.value }))}
                    className="h-9 w-20"
                />
            )
        }
        return (
            <Input
                value={masterList.editingFields.name || ""}
                onChange={(e) => masterList.setEditingFields(prev => ({ ...prev, name: e.target.value }))}
                className="h-9"
                autoFocus
                placeholder="部署名"
            />
        )
    }

    return (
        <MasterListPage<Department>
            title="部署管理"
            entityLabel="部署"
            {...getMasterListPageProps(masterList)}
            columns={columns}
            newItemForm={newItemForm}
            onAdd={handleAdd}
            renderEditCell={renderEditCell}
            onStartEdit={(d) => masterList.handleStartEdit(d, { name: d.name, sortOrder: String(d.sortOrder) })}
            onSaveEdit={handleSaveEdit}
        />
    )
}

export default function DepartmentSettingsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <DepartmentSettingsContent />
        </Suspense>
    )
}
