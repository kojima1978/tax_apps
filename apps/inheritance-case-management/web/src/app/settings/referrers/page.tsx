"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { Label } from "@/components/ui/Label"
import { SelectField } from "@/components/ui/SelectField"
import type { Referrer, Company, CompanyBranch } from "@/types/shared"
import { formatReferrerLabel } from "@/types/shared"
import { getReferrers, createReferrer, updateReferrer, deleteReferrer } from "@/lib/api/referrers"
import { getCompanies } from "@/lib/api/companies"
import { getCompanyBranches } from "@/lib/api/company-branches"
import { useMasterList, nextTempId } from "@/hooks/use-master-list"
import { MasterListPage, getMasterListPageProps, type ColumnDef } from "@/components/MasterListPage"

const columns: ColumnDef<Referrer>[] = [
    { key: "company", label: "会社名", renderCell: (r) => r.company.name },
    { key: "branch", label: "部門", width: "200px", renderCell: (r) => r.branch?.name || "-" },
]

function ReferrerSettingsContent() {
    const [companies, setCompanies] = useState<Company[]>([])
    const [branches, setBranches] = useState<CompanyBranch[]>([])

    useEffect(() => {
        Promise.all([getCompanies(), getCompanyBranches()])
            .then(([c, b]) => {
                setCompanies(c.filter(c => c.active))
                setBranches(b.filter(b => b.active))
            })
            .catch(() => {})
    }, [])

    const [newCompanyId, setNewCompanyId] = useState("")
    const [newBranchId, setNewBranchId] = useState("")
    const [newCompanyError, setNewCompanyError] = useState("")

    // 新規追加時: 選択中の会社に紐づく部門のみ表示
    const filteredNewBranches = useMemo(() => {
        if (!newCompanyId) return []
        return branches.filter(b => b.companyId === parseInt(newCompanyId, 10))
    }, [branches, newCompanyId])

    const masterList = useMasterList<Referrer, Parameters<typeof createReferrer>[0], Parameters<typeof updateReferrer>[1]>({
        fetchAll: getReferrers,
        create: createReferrer,
        update: updateReferrer,
        remove: deleteReferrer,
        getCreatePayload: (r) => ({ companyId: r.companyId, branchId: r.branchId ?? null }),
        getUpdatePayload: (r) => ({ companyId: r.companyId, branchId: r.branchId ?? null, active: r.active }),
        entityLabel: "紹介者",
        savedParam: "referrers",
        sortFields: ["company", "branch"],
        getSortValue: (r, field) => {
            if (field === "company") return r.company.name
            return r.branch?.name || ""
        },
        getDeleteLabel: (r) => formatReferrerLabel(r),
    })

    const handleAdd = () => {
        if (!newCompanyId) { setNewCompanyError("会社を選択してください"); return }

        setNewCompanyError("")
        const companyIdNum = parseInt(newCompanyId, 10)
        const company = companies.find(c => c.id === companyIdNum)
        const branchIdNum = newBranchId ? parseInt(newBranchId, 10) : null
        const branch = branchIdNum ? branches.find(b => b.id === branchIdNum) ?? null : null
        masterList.handleAdd({
            id: nextTempId(),
            companyId: companyIdNum,
            company: company ?? { id: companyIdNum, name: "", active: true },
            branchId: branchIdNum,
            branch,
            active: true,
        } as Referrer)
        setNewCompanyId(""); setNewBranchId("")
    }

    // 編集時: 選択中の会社に紐づく部門のみ表示
    const filteredEditBranches = useMemo(() => {
        const companyId = masterList.editingFields.companyId
        if (!companyId) return []
        return branches.filter(b => b.companyId === parseInt(companyId, 10))
    }, [branches, masterList.editingFields.companyId])

    const handleSaveEdit = () => {
        masterList.handleSaveEdit(
            () => {
                if (!masterList.editingFields.companyId) return false
                return true
            },
            (item) => {
                const companyIdNum = parseInt(masterList.editingFields.companyId, 10)
                const company = companies.find(c => c.id === companyIdNum)
                const branchIdNum = masterList.editingFields.branchId ? parseInt(masterList.editingFields.branchId, 10) : null
                const branch = branchIdNum ? branches.find(b => b.id === branchIdNum) ?? null : null
                return {
                    ...item,
                    companyId: companyIdNum,
                    company: company ?? item.company,
                    branchId: branchIdNum,
                    branch,
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
                    onChange={(e) => { setNewCompanyId(e.target.value); setNewBranchId(""); if (newCompanyError) setNewCompanyError("") }}
                    className={newCompanyError ? "border-red-500" : ""}
                >
                    <option value="">会社を選択</option>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectField>
                {newCompanyError && <p className="text-xs text-red-500">{newCompanyError}</p>}
            </div>
            <div className="grid gap-1.5">
                <Label>部門 (任意)</Label>
                <SelectField
                    value={newBranchId}
                    onChange={(e) => setNewBranchId(e.target.value)}
                    disabled={!newCompanyId}
                >
                    <option value="">なし</option>
                    {filteredNewBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </SelectField>
            </div>
        </div>
    )

    const renderEditCell = (col: ColumnDef<Referrer>) => {
        if (col.key === "company") {
            return (
                <SelectField
                    value={masterList.editingFields.companyId || ""}
                    onChange={(e) => masterList.setEditingFields(prev => ({ ...prev, companyId: e.target.value, branchId: "" }))}
                    className="h-9"
                >
                    <option value="">会社を選択</option>
                    {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </SelectField>
            )
        }
        return (
            <SelectField
                value={masterList.editingFields.branchId || ""}
                onChange={(e) => masterList.setEditingFields(prev => ({ ...prev, branchId: e.target.value }))}
                className="h-9"
            >
                <option value="">なし</option>
                {filteredEditBranches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </SelectField>
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
            onStartEdit={(r) => masterList.handleStartEdit(r, { companyId: String(r.companyId), branchId: r.branchId ? String(r.branchId) : "" })}
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
