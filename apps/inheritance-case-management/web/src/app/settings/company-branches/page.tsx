"use client"

import { useState, useEffect, Suspense } from "react"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { SelectField } from "@/components/ui/SelectField"
import type { Company, CompanyBranch } from "@/types/shared"
import { getCompanies } from "@/lib/api/companies"
import { getCompanyBranches, createCompanyBranch, updateCompanyBranch, deleteCompanyBranch } from "@/lib/api/company-branches"
import { useMasterList, nextTempId } from "@/hooks/use-master-list"
import { MasterListPage, getMasterListPageProps, type ColumnDef } from "@/components/MasterListPage"

const columns: ColumnDef<CompanyBranch>[] = [
    { key: "company", label: "会社名", renderCell: (b) => b.company?.name ?? "-" },
    { key: "name", label: "部門名", width: "200px" },
]

function CompanyBranchSettingsContent() {
    const [companies, setCompanies] = useState<Company[]>([])

    useEffect(() => {
        getCompanies().then((items) => setCompanies(items.filter(c => c.active)))
            .catch(() => {})
    }, [])

    const [newCompanyId, setNewCompanyId] = useState("")
    const [newName, setNewName] = useState("")
    const [newCompanyError, setNewCompanyError] = useState("")
    const [newNameError, setNewNameError] = useState("")

    const masterList = useMasterList<CompanyBranch, Parameters<typeof createCompanyBranch>[0], Parameters<typeof updateCompanyBranch>[1]>({
        fetchAll: getCompanyBranches,
        create: createCompanyBranch,
        update: updateCompanyBranch,
        remove: deleteCompanyBranch,
        getCreatePayload: (b) => ({ companyId: b.companyId, name: b.name }),
        getUpdatePayload: (b) => ({ companyId: b.companyId, name: b.name, active: b.active }),
        entityLabel: "部門",
        savedParam: "company-branches",
        sortFields: ["company", "name"],
        getSortValue: (b, field) => {
            if (field === "company") return b.company?.name ?? ""
            return b.name
        },
        getDeleteLabel: (b) => `${b.company?.name ?? ""} / ${b.name}`,
    })

    const handleAdd = () => {
        let hasError = false
        if (!newCompanyId) { setNewCompanyError("会社を選択してください"); hasError = true }
        if (!newName.trim()) { setNewNameError("部門名を入力してください"); hasError = true }
        if (hasError) return

        setNewCompanyError(""); setNewNameError("")
        const companyIdNum = parseInt(newCompanyId, 10)
        const company = companies.find(c => c.id === companyIdNum)
        masterList.handleAdd({
            id: nextTempId(),
            companyId: companyIdNum,
            company: company ?? { id: companyIdNum, name: "", active: true },
            name: newName.trim(),
            active: true,
        } as CompanyBranch)
        setNewCompanyId(""); setNewName("")
    }

    const handleSaveEdit = () => {
        masterList.handleSaveEdit(
            () => {
                if (!masterList.editingFields.companyId) return false
                if (!masterList.editingFields.name?.trim()) return false
                return true
            },
            (item) => {
                const companyIdNum = parseInt(masterList.editingFields.companyId, 10)
                const company = companies.find(c => c.id === companyIdNum)
                return {
                    ...item,
                    companyId: companyIdNum,
                    company: company ?? item.company,
                    name: masterList.editingFields.name.trim(),
                }
            }
        )
    }

    const newItemForm = (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
            <div className="grid gap-1.5">
                <Label>会社名 (必須)</Label>
                <SelectField
                    value={newCompanyId}
                    onChange={(e) => { setNewCompanyId(e.target.value); if (newCompanyError) setNewCompanyError("") }}
                    className={newCompanyError ? "border-red-500" : ""}
                >
                    <option value="">会社を選択</option>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectField>
                {newCompanyError && <p className="text-xs text-red-500">{newCompanyError}</p>}
            </div>
            <div className="grid gap-1.5">
                <Label>部門名 (必須)</Label>
                <Input
                    placeholder="部門名を入力"
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); if (newNameError) setNewNameError("") }}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    className={newNameError ? "border-red-500" : ""}
                />
                {newNameError && <p className="text-xs text-red-500">{newNameError}</p>}
            </div>
        </div>
    )

    const renderEditCell = (col: ColumnDef<CompanyBranch>) => {
        if (col.key === "company") {
            return (
                <SelectField
                    value={masterList.editingFields.companyId || ""}
                    onChange={(e) => masterList.setEditingFields(prev => ({ ...prev, companyId: e.target.value }))}
                    className="h-9"
                >
                    <option value="">会社を選択</option>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectField>
            )
        }
        return (
            <Input
                value={masterList.editingFields.name || ""}
                onChange={(e) => masterList.setEditingFields(prev => ({ ...prev, name: e.target.value }))}
                className="h-9"
                autoFocus
                placeholder="部門名"
            />
        )
    }

    return (
        <MasterListPage<CompanyBranch>
            title="部門管理（紹介元）"
            entityLabel="部門"
            {...getMasterListPageProps(masterList)}
            columns={columns}
            newItemForm={newItemForm}
            onAdd={handleAdd}
            renderEditCell={renderEditCell}
            onStartEdit={(b) => masterList.handleStartEdit(b, { companyId: String(b.companyId), name: b.name })}
            onSaveEdit={handleSaveEdit}
            groupBy={(b) => b.company?.name ?? ""}
        />
    )
}

export default function CompanyBranchSettingsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CompanyBranchSettingsContent />
        </Suspense>
    )
}
