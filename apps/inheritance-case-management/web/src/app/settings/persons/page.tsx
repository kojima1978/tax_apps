"use client"

import { Suspense } from "react"
import { Input } from "@/components/ui/Input"
import { MasterListPage, getMasterListPageProps, type ColumnDef } from "@/components/MasterListPage"
import { useMasterList, nextTempId, type MasterListConfig } from "@/hooks/use-master-list"
import type { Person } from "@/types/shared"
import type { CreatePersonInput, UpdatePersonInput } from "@/types/validation"
import { getPersons, createPerson, updatePerson, deletePerson } from "@/lib/api/masters"
import { useToast } from "@/components/ui/Toast"
import { useState } from "react"

const COLUMNS: ColumnDef<Person>[] = [
    { key: "name", label: "氏名", width: "160px" },
    { key: "phone", label: "電話番号", width: "140px" },
    { key: "address", label: "住所", renderCell: (item) => {
        const parts = [item.postalCode && `〒${item.postalCode}`, item.address].filter(Boolean)
        return parts.length > 0 ? (
            <span className="text-sm">{parts.join(" ")}</span>
        ) : (
            <span className="text-muted-foreground">-</span>
        )
    }},
    { key: "memo", label: "メモ", renderCell: (item) =>
        item.memo ? (
            <span className="text-sm text-muted-foreground truncate max-w-[200px] block">{item.memo}</span>
        ) : (
            <span className="text-muted-foreground">-</span>
        )
    },
]

const MASTER_CONFIG: MasterListConfig<Person, CreatePersonInput, UpdatePersonInput> = {
    fetchAll: getPersons,
    create: createPerson,
    update: updatePerson,
    remove: deletePerson,
    getCreatePayload: (item) => ({
        name: item.name,
        phone: item.phone || "",
        postalCode: item.postalCode || "",
        address: item.address || "",
        memo: item.memo || "",
    }),
    getUpdatePayload: (item) => ({
        name: item.name,
        phone: item.phone || undefined,
        postalCode: item.postalCode || undefined,
        address: item.address || undefined,
        memo: item.memo || undefined,
        active: item.active,
    }),
    entityLabel: "人物",
    savedParam: "persons",
    sortFields: ["name", "phone", "address"],
    defaultSortField: "name",
    getSortValue: (item, field) => {
        switch (field) {
            case "name": return item.name
            case "phone": return item.phone || ""
            case "address": return item.address || ""
            case "memo": return item.memo || ""
            default: return ""
        }
    },
    getDeleteLabel: (item) => item.name,
}

function PersonsContent() {
    const toast = useToast()
    const ml = useMasterList(MASTER_CONFIG)

    const [newName, setNewName] = useState("")
    const [newPhone, setNewPhone] = useState("")

    const handleAdd = () => {
        const name = newName.trim()
        if (!name) {
            toast.warning("氏名を入力してください")
            return
        }
        ml.handleAdd({
            id: nextTempId(),
            name,
            phone: newPhone.trim(),
            postalCode: "",
            address: "",
            memo: "",
            active: true,
        })
        setNewName("")
        setNewPhone("")
    }

    const handleStartEdit = (item: Person) => {
        ml.handleStartEdit(item, {
            name: item.name,
            phone: item.phone || "",
            postalCode: item.postalCode || "",
            address: item.address || "",
            memo: item.memo || "",
        })
    }

    const handleSaveEdit = () => {
        ml.handleSaveEdit(
            () => {
                if (!ml.editingFields.name?.trim()) {
                    toast.warning("氏名を入力してください")
                    return false
                }
                return true
            },
            (item) => ({
                ...item,
                name: ml.editingFields.name.trim(),
                phone: ml.editingFields.phone?.trim() || "",
                postalCode: ml.editingFields.postalCode?.trim() || "",
                address: ml.editingFields.address?.trim() || "",
                memo: ml.editingFields.memo?.trim() || "",
            })
        )
    }

    const renderEditCell = (col: ColumnDef<Person>) => {
        switch (col.key) {
            case "name":
                return (
                    <Input
                        value={ml.editingFields.name || ""}
                        onChange={(e) => ml.setEditingFields(f => ({ ...f, name: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") ml.handleCancelEdit() }}
                        className="h-8 text-sm"
                        autoFocus
                    />
                )
            case "phone":
                return (
                    <Input
                        value={ml.editingFields.phone || ""}
                        onChange={(e) => ml.setEditingFields(f => ({ ...f, phone: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") ml.handleCancelEdit() }}
                        className="h-8 text-sm"
                    />
                )
            case "address":
                return (
                    <div className="flex gap-1">
                        <Input
                            value={ml.editingFields.postalCode || ""}
                            onChange={(e) => ml.setEditingFields(f => ({ ...f, postalCode: e.target.value }))}
                            placeholder="郵便番号"
                            className="h-8 text-sm w-24"
                        />
                        <Input
                            value={ml.editingFields.address || ""}
                            onChange={(e) => ml.setEditingFields(f => ({ ...f, address: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") ml.handleCancelEdit() }}
                            placeholder="住所"
                            className="h-8 text-sm flex-1"
                        />
                    </div>
                )
            case "memo":
                return (
                    <Input
                        value={ml.editingFields.memo || ""}
                        onChange={(e) => ml.setEditingFields(f => ({ ...f, memo: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") ml.handleCancelEdit() }}
                        placeholder="メモ"
                        className="h-8 text-sm"
                    />
                )
            default:
                return null
        }
    }

    const newItemForm = (
        <div className="flex items-end gap-2 flex-1">
            <div className="space-y-1">
                <label className="text-xs text-muted-foreground">氏名</label>
                <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    placeholder="例: 山田 花子"
                    className="h-9 text-sm w-40"
                />
            </div>
            <div className="space-y-1">
                <label className="text-xs text-muted-foreground">電話番号</label>
                <Input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    placeholder="03-1234-5678"
                    className="h-9 text-sm w-36"
                />
            </div>
        </div>
    )

    return (
        <MasterListPage<Person>
            {...getMasterListPageProps(ml)}
            title="人物マスタ管理"
            entityLabel="人物"
            columns={COLUMNS}
            newItemForm={newItemForm}
            onAdd={handleAdd}
            renderEditCell={renderEditCell}
            onStartEdit={handleStartEdit}
            onSaveEdit={handleSaveEdit}
        />
    )
}

export default function PersonsPage() {
    return (
        <Suspense fallback={<div className="container mx-auto py-10 px-4"><p className="text-muted-foreground">読み込み中...</p></div>}>
            <PersonsContent />
        </Suspense>
    )
}
