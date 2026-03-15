"use client"

import { useState, useMemo, useRef, useEffect, Suspense } from "react"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import type { Referrer } from "@/types/shared"
import { getReferrers, createReferrer, updateReferrer, deleteReferrer } from "@/lib/api/referrers"
import { useMasterList, nextTempId } from "@/hooks/use-master-list"
import { MasterListPage, getMasterListPageProps, type ColumnDef } from "@/components/MasterListPage"

/** 会社名サジェスト付きInput */
function CompanySuggestInput({ value, onChange, suggestions, placeholder, className, onKeyDown }: {
    value: string
    onChange: (val: string) => void
    suggestions: string[]
    placeholder?: string
    className?: string
    onKeyDown?: (e: React.KeyboardEvent) => void
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [])

    const filtered = value.trim()
        ? suggestions.filter(s => s !== value && s.includes(value.trim()))
        : []

    return (
        <div ref={ref} className="relative">
            <Input
                placeholder={placeholder}
                value={value}
                onChange={(e) => { onChange(e.target.value); setOpen(true) }}
                onFocus={() => setOpen(true)}
                onKeyDown={onKeyDown}
                className={className}
            />
            {open && filtered.length > 0 && (
                <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-md py-1 max-h-40 overflow-y-auto">
                    {filtered.map(s => (
                        <button
                            key={s}
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted"
                            onClick={() => { onChange(s); setOpen(false) }}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

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

    // 既存の会社名一覧（重複排除・サジェスト用）
    const companySuggestions = useMemo(() => {
        const names = new Set(masterList.items.map((r: Referrer) => r.company))
        return Array.from(names).sort((a, b) => a.localeCompare(b, "ja"))
    }, [masterList.items])

    const handleAdd = () => {
        let hasError = false
        if (!newCompany.trim()) { setNewCompanyError("会社名を入力してください"); hasError = true }
        if (!newName.trim()) { setNewNameError("氏名を入力してください"); hasError = true }
        if (hasError) return

        setNewCompanyError(""); setNewNameError("")
        masterList.handleAdd({
            id: nextTempId(),
            company: newCompany.trim(),
            department: newDept.trim(),
            name: newName.trim(),
            active: true,
        } as Referrer)
        setNewCompany(""); setNewDept(""); setNewName("")
    }

    const handleSaveEdit = () => {
        const newCompanyName = masterList.editingFields.company?.trim()
        const editingItem = masterList.items.find((r: Referrer) => r.id === masterList.editingId)
        const oldCompanyName = editingItem?.company

        masterList.handleSaveEdit(
            () => !!(newCompanyName && masterList.editingFields.name?.trim()),
            (item) => ({
                ...item,
                company: newCompanyName!,
                department: masterList.editingFields.department?.trim() || "",
                name: masterList.editingFields.name.trim(),
            })
        )

        // 会社名が変更された場合、同じ旧会社名を持つ他の紹介者にも一括反映
        if (oldCompanyName && newCompanyName && oldCompanyName !== newCompanyName) {
            const othersCount = masterList.items.filter((r: Referrer) => r.id !== editingItem!.id && r.company === oldCompanyName).length
            if (othersCount > 0 && window.confirm(
                `「${oldCompanyName}」→「${newCompanyName}」に変更しました。\n同じ会社名の他${othersCount}名の紹介者にも反映しますか？`
            )) {
                masterList.updateItems(prev => prev.map(r =>
                    r.company === oldCompanyName ? { ...r, company: newCompanyName } : r
                ))
            }
        }
    }

    const newItemForm = (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div className="grid gap-1.5">
                <Label>会社名 (必須)</Label>
                <CompanySuggestInput
                    placeholder="会社名"
                    value={newCompany}
                    onChange={(val) => { setNewCompany(val); if (newCompanyError) setNewCompanyError("") }}
                    suggestions={companySuggestions}
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

    const renderEditCell = (col: ColumnDef<Referrer>) => {
        if (col.key === "company") {
            return (
                <CompanySuggestInput
                    value={masterList.editingFields.company || ""}
                    onChange={(val) => masterList.setEditingFields(prev => ({ ...prev, company: val }))}
                    suggestions={companySuggestions}
                    placeholder="会社名"
                    className="h-9"
                />
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
            onStartEdit={(r) => masterList.handleStartEdit(r, { company: r.company, department: r.department || "", name: r.name })}
            onSaveEdit={handleSaveEdit}
            groupBy={(r) => r.company}
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
