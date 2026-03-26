"use client"

import { useState, Suspense } from "react"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import type { Company } from "@/types/shared"
import { getCompanies, createCompany, updateCompany, deleteCompany } from "@/lib/api/companies"
import { useMasterList, nextTempId } from "@/hooks/use-master-list"
import { MasterListPage, getMasterListPageProps, type ColumnDef } from "@/components/MasterListPage"

const columns: ColumnDef<Company>[] = [
    { key: "name", label: "会社名" },
]

function CompanySettingsContent() {
    const [newName, setNewName] = useState("")
    const [newNameError, setNewNameError] = useState("")

    const masterList = useMasterList<Company, Parameters<typeof createCompany>[0], Parameters<typeof updateCompany>[1]>({
        fetchAll: getCompanies,
        create: createCompany,
        update: updateCompany,
        remove: deleteCompany,
        getCreatePayload: (c) => ({ name: c.name }),
        getUpdatePayload: (c) => ({ name: c.name, active: c.active }),
        entityLabel: "会社",
        savedParam: "companies",
        sortFields: ["name"],
        getSortValue: (c) => c.name,
        getDeleteLabel: (c) => c.name,
    })

    const handleAdd = () => {
        if (!newName.trim()) { setNewNameError("会社名を入力してください"); return }
        setNewNameError("")
        masterList.handleAdd({
            id: nextTempId(),
            name: newName.trim(),
            active: true,
        } as Company)
        setNewName("")
    }

    const handleSaveEdit = () => {
        masterList.handleSaveEdit(
            () => !!masterList.editingFields.name?.trim(),
            (item) => ({ ...item, name: masterList.editingFields.name.trim() })
        )
    }

    const newItemForm = (
        <div className="grid gap-1.5 w-full max-w-md">
            <Label htmlFor="new-name">会社名 (必須)</Label>
            <Input
                id="new-name"
                placeholder="会社名を入力"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); if (newNameError) setNewNameError("") }}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                className={newNameError ? "border-red-500" : ""}
            />
            {newNameError && <p className="text-xs text-red-500">{newNameError}</p>}
        </div>
    )

    const renderEditCell = () => (
        <Input
            value={masterList.editingFields.name || ""}
            onChange={(e) => masterList.setEditingFields(prev => ({ ...prev, name: e.target.value }))}
            className="h-9"
            autoFocus
            placeholder="会社名"
        />
    )

    return (
        <MasterListPage<Company>
            title="会社管理"
            entityLabel="会社"
            {...getMasterListPageProps(masterList)}
            columns={columns}
            newItemForm={newItemForm}
            onAdd={handleAdd}
            renderEditCell={renderEditCell}
            onStartEdit={(c) => masterList.handleStartEdit(c, { name: c.name })}
            onSaveEdit={handleSaveEdit}
        />
    )
}

export default function CompanySettingsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CompanySettingsContent />
        </Suspense>
    )
}
