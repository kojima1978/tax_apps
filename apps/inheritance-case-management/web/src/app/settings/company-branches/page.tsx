"use client"

import { useState, useEffect, Suspense } from "react"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { SelectField } from "@/components/ui/SelectField"
import type { Company, CompanyBranch } from "@/types/shared"
import { getCompanies } from "@/lib/api/companies"
import { getCompanyBranches, createCompanyBranch, updateCompanyBranch, deleteCompanyBranch } from "@/lib/api/company-branches"
import { useMasterList, nextTempId } from "@/hooks/use-master-list"
import { useFormFields } from "@/hooks/use-form-fields"
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

    const form = useFormFields({ companyId: "", name: "" })

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
        if (!form.values.companyId) { form.setError("companyId", "会社を選択してください"); hasError = true }
        if (!form.values.name.trim()) { form.setError("name", "部門名を入力してください"); hasError = true }
        if (hasError) return

        form.clearErrors()
        const companyIdNum = parseInt(form.values.companyId, 10)
        const company = companies.find(c => c.id === companyIdNum)
        masterList.handleAdd({
            id: nextTempId(),
            companyId: companyIdNum,
            company: company ?? { id: companyIdNum, name: "", active: true },
            name: form.values.name.trim(),
            active: true,
        } as CompanyBranch)
        form.reset()
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
                    value={form.values.companyId}
                    onChange={(e) => form.set("companyId", e.target.value)}
                    className={form.errors.companyId ? "border-red-500" : ""}
                >
                    <option value="">会社を選択</option>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectField>
                {form.errors.companyId && <p className="text-xs text-red-500">{form.errors.companyId}</p>}
            </div>
            <div className="grid gap-1.5">
                <Label>部門名 (必須)</Label>
                <Input
                    placeholder="部門名を入力"
                    value={form.values.name}
                    onChange={(e) => form.set("name", e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    className={form.errors.name ? "border-red-500" : ""}
                />
                {form.errors.name && <p className="text-xs text-red-500">{form.errors.name}</p>}
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
