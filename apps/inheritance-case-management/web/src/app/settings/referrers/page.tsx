"use client"

import { useState, Suspense } from "react"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import type { Referrer } from "@tax-apps/shared"
import { getReferrers, createReferrer, updateReferrer, deleteReferrer } from "@/lib/api/referrers"
import { useMasterList } from "@/hooks/use-master-list"
import { MasterListPage, type ColumnDef } from "@/components/MasterListPage"

const columns: ColumnDef<Referrer>[] = [
    { key: "company", label: "会社名" },
    { key: "department", label: "部署", width: "200px", renderCell: (r) => r.department || "-" },
    { key: "name", label: "氏名", width: "200px" },
]

function ReferrerSettingsContent() {
    const [newCompany, setNewCompany] = useState("")
    const [newDept, setNewDept] = useState("")
    const [newName, setNewName] = useState("")
    const [newCompanyError, setNewCompanyError] = useState("")
    const [newNameError, setNewNameError] = useState("")

    const masterList = useMasterList<Referrer, Parameters<typeof createReferrer>[0], Parameters<typeof updateReferrer>[1]>({
        fetchAll: getReferrers,
        create: createReferrer,
        update: updateReferrer,
        remove: deleteReferrer,
        getCreatePayload: (r) => ({ company: r.company, department: r.department, name: r.name }),
        getUpdatePayload: (r) => ({ company: r.company, department: r.department, name: r.name, active: r.active }),
        entityLabel: "紹介者",
        savedParam: "referrers",
        sortFields: ["company", "department", "name"],
        getSortValue: (r, field) => {
            if (field === "company") return r.company
            if (field === "department") return r.department || ""
            return r.name
        },
        getDeleteLabel: (r) => `${r.company} / ${r.name}`,
    })

    const handleAdd = () => {
        let hasError = false
        if (!newCompany.trim()) { setNewCompanyError("会社名を入力してください"); hasError = true }
        if (!newName.trim()) { setNewNameError("氏名を入力してください"); hasError = true }
        if (hasError) return

        setNewCompanyError(""); setNewNameError("")
        masterList.handleAdd({
            id: `temp_${Date.now()}`,
            company: newCompany.trim(),
            department: newDept.trim(),
            name: newName.trim(),
            active: true,
        } as Referrer)
        setNewCompany(""); setNewDept(""); setNewName("")
    }

    const handleSaveEdit = () => {
        masterList.handleSaveEdit(
            () => !!(masterList.editingFields.company?.trim() && masterList.editingFields.name?.trim()),
            (item) => ({
                ...item,
                company: masterList.editingFields.company.trim(),
                department: masterList.editingFields.department?.trim() || "",
                name: masterList.editingFields.name.trim(),
            })
        )
    }

    const newItemForm = (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div className="grid gap-1.5">
                <Label>会社名 (必須)</Label>
                <Input
                    placeholder="会社名"
                    value={newCompany}
                    onChange={(e) => { setNewCompany(e.target.value); if (newCompanyError) setNewCompanyError("") }}
                    className={newCompanyError ? "border-red-500" : ""}
                />
                {newCompanyError && <p className="text-xs text-red-500">{newCompanyError}</p>}
            </div>
            <div className="grid gap-1.5">
                <Label>部署 (任意)</Label>
                <Input placeholder="部署名" value={newDept} onChange={(e) => setNewDept(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
                <Label>氏名 (必須)</Label>
                <Input
                    placeholder="氏名"
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); if (newNameError) setNewNameError("") }}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    className={newNameError ? "border-red-500" : ""}
                />
                {newNameError && <p className="text-xs text-red-500">{newNameError}</p>}
            </div>
        </div>
    )

    const renderEditCell = (col: ColumnDef<Referrer>) => (
        <Input
            value={masterList.editingFields[col.key] || ""}
            onChange={(e) => masterList.setEditingFields(prev => ({ ...prev, [col.key]: e.target.value }))}
            placeholder={col.label}
            className="h-9"
            autoFocus={col.key === "name"}
        />
    )

    return (
        <MasterListPage<Referrer>
            title="紹介者管理"
            entityLabel="紹介者"
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
            onStartEdit={(r) => masterList.handleStartEdit(r, { company: r.company, department: r.department || "", name: r.name })}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={masterList.handleCancelEdit}
            onToggleActive={masterList.handleToggleActive}
            onPermanentDelete={masterList.handlePermanentDelete}
            onSave={masterList.handleSave}
            onSort={masterList.handleSort}
        />
    )
}

export default function ReferrerSettingsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ReferrerSettingsContent />
        </Suspense>
    )
}
