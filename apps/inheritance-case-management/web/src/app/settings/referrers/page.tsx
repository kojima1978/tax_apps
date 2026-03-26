"use client"

import { useState, useEffect, Suspense } from "react"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { SelectField } from "@/components/ui/SelectField"
import type { Referrer, Company } from "@/types/shared"
import { formatReferrerLabel } from "@/types/shared"
import { getReferrers, createReferrer, updateReferrer, deleteReferrer } from "@/lib/api/referrers"
import { getCompanies } from "@/lib/api/companies"
import { useMasterList, nextTempId } from "@/hooks/use-master-list"
import { MasterListPage, getMasterListPageProps, type ColumnDef } from "@/components/MasterListPage"

const columns: ColumnDef<Referrer>[] = [
    { key: "company", label: "会社名", renderCell: (r) => r.company.name },
    { key: "department", label: "部署", width: "200px", renderCell: (r) => r.department || "-" },
    { key: "name", label: "氏名", width: "200px", renderCell: (r) => r.name || "-" },
]

function ReferrerSettingsContent() {
    const [companies, setCompanies] = useState<Company[]>([])

    useEffect(() => {
        getCompanies().then((items) => setCompanies(items.filter(c => c.active)))
            .catch(() => {})
    }, [])

    const [newCompanyId, setNewCompanyId] = useState("")
    const [newDept, setNewDept] = useState("")
    const [newName, setNewName] = useState("")
    const [newCompanyError, setNewCompanyError] = useState("")

    const masterList = useMasterList<Referrer, Parameters<typeof createReferrer>[0], Parameters<typeof updateReferrer>[1]>({
        fetchAll: getReferrers,
        create: createReferrer,
        update: updateReferrer,
        remove: deleteReferrer,
        getCreatePayload: (r) => ({ companyId: r.companyId, department: r.department, name: r.name || undefined }),
        getUpdatePayload: (r) => ({ companyId: r.companyId, department: r.department, name: r.name || undefined, active: r.active }),
        entityLabel: "紹介者",
        savedParam: "referrers",
        sortFields: ["company", "department", "name"],
        getSortValue: (r, field) => {
            if (field === "company") return r.company.name
            if (field === "department") return r.department || ""
            return r.name || ""
        },
        getDeleteLabel: (r) => formatReferrerLabel(r),
    })

    const handleAdd = () => {
        let hasError = false
        if (!newCompanyId) { setNewCompanyError("会社を選択してください"); hasError = true }
        if (hasError) return

        setNewCompanyError("")
        const companyIdNum = parseInt(newCompanyId, 10)
        const company = companies.find(c => c.id === companyIdNum)
        masterList.handleAdd({
            id: nextTempId(),
            companyId: companyIdNum,
            company: company ?? { id: companyIdNum, name: "", active: true },
            department: newDept.trim(),
            name: newName.trim() || undefined,
            active: true,
        } as Referrer)
        setNewCompanyId(""); setNewDept(""); setNewName("")
    }

    const handleSaveEdit = () => {
        masterList.handleSaveEdit(
            () => !!masterList.editingFields.companyId,
            (item) => {
                const companyIdNum = parseInt(masterList.editingFields.companyId, 10)
                const company = companies.find(c => c.id === companyIdNum)
                return {
                    ...item,
                    companyId: companyIdNum,
                    company: company ?? item.company,
                    department: masterList.editingFields.department?.trim() || "",
                    name: masterList.editingFields.name?.trim() || undefined,
                }
            }
        )
    }

    const newItemForm = (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
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
                <Label>部署 (任意)</Label>
                <Input placeholder="部署名" value={newDept} onChange={(e) => setNewDept(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
                <Label>氏名 (任意)</Label>
                <Input
                    placeholder="氏名"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
            </div>
        </div>
    )

    const renderEditCell = (col: ColumnDef<Referrer>) => {
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
                value={masterList.editingFields[col.key] || ""}
                onChange={(e) => masterList.setEditingFields(prev => ({ ...prev, [col.key]: e.target.value }))}
                placeholder={col.label}
                className="h-9"
                autoFocus={col.key === "name"}
            />
        )
    }

    return (
        <MasterListPage<Referrer>
            title="紹介者管理"
            entityLabel="紹介者"
            {...getMasterListPageProps(masterList)}
            columns={columns}
            newItemForm={newItemForm}
            onAdd={handleAdd}
            renderEditCell={renderEditCell}
            onStartEdit={(r) => masterList.handleStartEdit(r, { companyId: String(r.companyId), department: r.department || "", name: r.name || "" })}
            onSaveEdit={handleSaveEdit}
            groupBy={(r) => r.company.name}
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
