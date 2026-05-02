"use client"

import { Suspense, type KeyboardEvent } from "react"
import { AddressCell } from "@/components/AddressCell"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { MasterListPage, getMasterListPageProps, type ColumnDef } from "@/components/MasterListPage"
import { useMasterList, nextTempId, type MasterListConfig } from "@/hooks/use-master-list"
import { applyPostalCodeAddress, normalizePersonAddressParts } from "@/lib/person-address"
import { formatPersonDeleteBlockedMessage } from "@/lib/person-delete-message"
import { normalizeNameKanaForStorage, personMatchesSearch } from "@/lib/person-search"
import { fetchAddressFromPostalCode } from "@/lib/postal-code"
import { formatPostalCodeForInput, normalizePostalCodeDigits } from "@/lib/postal-code-format"
import type { HeirPerson } from "@/types/shared"
import type { CreateHeirPersonInput, UpdateHeirPersonInput } from "@/types/validation"
import { getHeirPersons, createHeirPerson, updateHeirPerson, deleteHeirPerson } from "@/lib/api/masters"
import { useToast } from "@/components/ui/Toast"
import { Check, Loader2, Search, X } from "lucide-react"
import { useState } from "react"

const COLUMNS: ColumnDef<HeirPerson>[] = [
    {
        key: "name",
        label: "氏名",
        width: "190px",
        cellClassName: "align-top",
        renderCell: (item) => (
            <div className="min-w-0 leading-tight">
                <div className="truncate font-medium">{item.name}</div>
                {item.nameKana && (
                    <div className="mt-0.5 truncate text-xs font-normal text-muted-foreground">{item.nameKana}</div>
                )}
            </div>
        ),
    },
    { key: "phone", label: "電話番号", width: "140px" },
    {
        key: "address",
        label: "住所",
        width: "380px",
        cellClassName: "align-top",
        renderCell: (item) => (
            <AddressCell
                postalCode={item.postalCode}
                address={item.address}
                addressFromPostalCode={item.addressFromPostalCode}
                addressManual={item.addressManual}
            />
        ),
    },
    { key: "memo", label: "メモ", renderCell: (item) =>
        item.memo ? (
            <span className="text-sm text-muted-foreground truncate max-w-[200px] block">{item.memo}</span>
        ) : (
            <span className="text-muted-foreground">-</span>
        )
    },
]

const EDIT_INPUT_CLASS = "h-10 rounded-md border text-sm focus-visible:ring-1 focus-visible:ring-offset-0"

const MASTER_CONFIG: MasterListConfig<HeirPerson, CreateHeirPersonInput, UpdateHeirPersonInput> = {
    fetchAll: getHeirPersons,
    create: createHeirPerson,
    update: updateHeirPerson,
    remove: deleteHeirPerson,
    getCreatePayload: (item) => ({
        name: item.name,
        nameKana: item.nameKana || "",
        phone: item.phone || "",
        postalCode: item.postalCode || "",
        address: item.address || "",
        addressFromPostalCode: item.addressFromPostalCode || "",
        addressManual: item.addressManual || "",
        memo: item.memo || "",
    }),
    getUpdatePayload: (item) => ({
        name: item.name,
        nameKana: item.nameKana || "",
        phone: item.phone || "",
        postalCode: item.postalCode || "",
        address: item.address || "",
        addressFromPostalCode: item.addressFromPostalCode || "",
        addressManual: item.addressManual || "",
        memo: item.memo || "",
        active: item.active,
    }),
    entityLabel: "相続人",
    savedParam: "heir-persons",
    sortFields: ["name", "phone", "address"],
    defaultSortField: "name",
    getSortValue: (item, field) => {
        switch (field) {
            case "name": return `${item.nameKana || item.name} ${item.name}`
            case "phone": return item.phone || ""
            case "address": return item.address || ""
            case "memo": return item.memo || ""
            default: return ""
        }
    },
    matchesSearch: personMatchesSearch,
    getDeleteLabel: (item) => item.name,
    getPermanentDeleteBlockMessage: (item) => {
        const total = item._count?.caseLinks ?? 0
        return total > 0 ? formatPersonDeleteBlockedMessage(total, "相続人") : null
    },
}

function HeirPersonsContent() {
    const toast = useToast()
    const ml = useMasterList(MASTER_CONFIG)

    const [newName, setNewName] = useState("")
    const [newNameKana, setNewNameKana] = useState("")
    const [newPhone, setNewPhone] = useState("")
    const [editAddressSearching, setEditAddressSearching] = useState(false)

    const handleAdd = () => {
        const name = newName.trim()
        if (!name) {
            toast.warning("氏名を入力してください")
            return
        }
        ml.handleAdd({
            id: nextTempId(),
            name,
            nameKana: normalizeNameKanaForStorage(newNameKana),
            phone: newPhone.trim(),
            postalCode: "",
            address: "",
            addressFromPostalCode: "",
            addressManual: "",
            memo: "",
            active: true,
        })
        setNewName("")
        setNewNameKana("")
        setNewPhone("")
    }

    const handleStartEdit = (item: HeirPerson) => {
        ml.handleStartEdit(item, {
            name: item.name,
            nameKana: item.nameKana || "",
            phone: item.phone || "",
            postalCode: item.postalCode || "",
            address: item.address || "",
            addressFromPostalCode: item.addressFromPostalCode || "",
            addressManual: item.addressManual || "",
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
            (item) => {
                const addressParts = normalizePersonAddressParts({
                    address: ml.editingFields.address,
                    addressFromPostalCode: ml.editingFields.addressFromPostalCode,
                    addressManual: ml.editingFields.addressManual,
                })
                return {
                    ...item,
                    name: ml.editingFields.name.trim(),
                    nameKana: normalizeNameKanaForStorage(ml.editingFields.nameKana || ""),
                    phone: ml.editingFields.phone?.trim() || "",
                    postalCode: ml.editingFields.postalCode?.trim() || "",
                    ...addressParts,
                    memo: ml.editingFields.memo?.trim() || "",
                }
            }
        )
    }

    const updateEditingAddressFromPostalCode = (addressFromPostalCode: string) => {
        ml.setEditingFields(f => ({
            ...f,
            addressFromPostalCode,
            address: normalizePersonAddressParts({ ...f, addressFromPostalCode }).address,
        }))
    }

    const updateEditingAddressManual = (addressManual: string) => {
        ml.setEditingFields(f => ({
            ...f,
            addressManual,
            address: normalizePersonAddressParts({ ...f, addressManual }).address,
        }))
    }

    const handleEditPostalCodeChange = async (value: string) => {
        const digits = normalizePostalCodeDigits(value)
        ml.setEditingFields(f => ({ ...f, postalCode: digits }))
        if (digits.length !== 7) return

        setEditAddressSearching(true)
        try {
            const address = await fetchAddressFromPostalCode(digits)
            if (address) {
                ml.setEditingFields(f => ({
                    ...f,
                    postalCode: digits,
                    ...applyPostalCodeAddress(f, address),
                }))
            }
        } finally {
            setEditAddressSearching(false)
        }
    }

    const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleSaveEdit()
        if (e.key === "Escape") ml.handleCancelEdit()
    }

    const renderEditRow = (item: HeirPerson) => {
        const fieldId = (field: string) => `heir-person-${item.id}-${field}`
        return (
            <div className="px-2 py-3">
                <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[160px_minmax(240px,1fr)_minmax(240px,1fr)_130px]">
                    <div className="space-y-1">
                        <Label htmlFor={fieldId("name")} className="text-xs text-muted-foreground">氏名</Label>
                        <Input
                            id={fieldId("name")}
                            value={ml.editingFields.name || ""}
                            onChange={(e) => ml.setEditingFields(f => ({ ...f, name: e.target.value }))}
                            onKeyDown={handleEditKeyDown}
                            placeholder="氏名"
                            className={EDIT_INPUT_CLASS}
                            autoFocus
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor={fieldId("nameKana")} className="text-xs text-muted-foreground">フリガナ</Label>
                        <Input
                            id={fieldId("nameKana")}
                            value={ml.editingFields.nameKana || ""}
                            onChange={(e) => ml.setEditingFields(f => ({ ...f, nameKana: e.target.value }))}
                            onKeyDown={handleEditKeyDown}
                            placeholder="ヤマダ ハナコ"
                            className={EDIT_INPUT_CLASS}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor={fieldId("phone")} className="text-xs text-muted-foreground">電話番号</Label>
                        <Input
                            id={fieldId("phone")}
                            value={ml.editingFields.phone || ""}
                            onChange={(e) => ml.setEditingFields(f => ({ ...f, phone: e.target.value }))}
                            onKeyDown={handleEditKeyDown}
                            placeholder="03-1234-5678"
                            className={EDIT_INPUT_CLASS}
                        />
                    </div>
                    <div className="space-y-1 lg:col-start-1 lg:row-start-2">
                        <Label htmlFor={fieldId("postalCode")} className="text-xs text-muted-foreground">郵便番号</Label>
                        <div className="flex gap-1">
                            <Input
                                id={fieldId("postalCode")}
                                value={formatPostalCodeForInput(ml.editingFields.postalCode || "")}
                                onChange={(e) => handleEditPostalCodeChange(e.target.value)}
                                onKeyDown={handleEditKeyDown}
                                placeholder="000-0000"
                                inputMode="numeric"
                                maxLength={8}
                                className={EDIT_INPUT_CLASS}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 shrink-0 rounded-md"
                                disabled={editAddressSearching}
                                onClick={async () => {
                                    setEditAddressSearching(true)
                                    try {
                                        const address = await fetchAddressFromPostalCode(ml.editingFields.postalCode || "")
                                        if (address) {
                                            ml.setEditingFields(f => ({
                                                ...f,
                                                ...applyPostalCodeAddress(f, address),
                                            }))
                                        }
                                    } finally {
                                        setEditAddressSearching(false)
                                    }
                                }}
                                title="郵便番号から住所を検索"
                                aria-label="郵便番号から住所を検索"
                            >
                                {editAddressSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                    <div className="space-y-1 sm:col-span-2 lg:col-span-3 lg:col-start-2 lg:row-start-2">
                        <Label htmlFor={fieldId("addressFromPostalCode")} className="text-xs text-muted-foreground">住所（郵便番号から自動入力）</Label>
                        <Input
                            id={fieldId("addressFromPostalCode")}
                            value={ml.editingFields.addressFromPostalCode || ""}
                            onChange={(e) => updateEditingAddressFromPostalCode(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            placeholder="都道府県 市区町村 町名"
                            className={EDIT_INPUT_CLASS}
                        />
                    </div>
                    <div className="space-y-1 sm:col-span-2 lg:col-span-3 lg:col-start-1 lg:row-start-3">
                        <Label htmlFor={fieldId("addressManual")} className="text-xs text-muted-foreground">住所補足（番地・建物名など手入力）</Label>
                        <Input
                            id={fieldId("addressManual")}
                            value={ml.editingFields.addressManual || ""}
                            onChange={(e) => updateEditingAddressManual(e.target.value)}
                            onKeyDown={handleEditKeyDown}
                            placeholder="番地・建物名・部屋番号"
                            className={EDIT_INPUT_CLASS}
                        />
                    </div>
                    <div className="space-y-1 lg:col-start-4 lg:row-start-1">
                        <Label htmlFor={fieldId("memo")} className="text-xs text-muted-foreground">メモ</Label>
                        <Input
                            id={fieldId("memo")}
                            value={ml.editingFields.memo || ""}
                            onChange={(e) => ml.setEditingFields(f => ({ ...f, memo: e.target.value }))}
                            onKeyDown={handleEditKeyDown}
                            placeholder="メモ"
                            className={EDIT_INPUT_CLASS}
                        />
                    </div>
                    <div className="flex justify-end gap-1 sm:col-span-2 lg:col-span-1 lg:col-start-4 lg:row-start-3">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-10 w-10 rounded-md"
                            onClick={handleSaveEdit}
                            title="保存"
                            aria-label="保存"
                        >
                            <Check className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-md text-muted-foreground hover:text-foreground"
                            onClick={ml.handleCancelEdit}
                            title="キャンセル"
                            aria-label="キャンセル"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    const newItemForm = (
        <div className="grid min-w-0 flex-1 items-end gap-3 md:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(150px,180px)]">
            <div className="space-y-1">
                <Label htmlFor="heir-person-new-name" className="text-xs text-muted-foreground">氏名</Label>
                <Input
                    id="heir-person-new-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    placeholder="例: 山田 花子"
                    className="h-10 text-sm w-full"
                />
            </div>
            <div className="space-y-1">
                <Label htmlFor="heir-person-new-name-kana" className="text-xs text-muted-foreground">フリガナ</Label>
                <Input
                    id="heir-person-new-name-kana"
                    value={newNameKana}
                    onChange={(e) => setNewNameKana(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    placeholder="例: ヤマダ ハナコ"
                    className="h-10 text-sm w-full"
                />
            </div>
            <div className="space-y-1">
                <Label htmlFor="heir-person-new-phone" className="text-xs text-muted-foreground">電話番号</Label>
                <Input
                    id="heir-person-new-phone"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    placeholder="03-1234-5678"
                    className="h-10 text-sm w-full"
                />
            </div>
        </div>
    )

    return (
        <MasterListPage<HeirPerson>
            {...getMasterListPageProps(ml)}
            title="相続人マスタ管理"
            entityLabel="相続人"
            columns={COLUMNS}
            searchPlaceholder="氏名・フリガナ・電話番号・住所で検索"
            newItemForm={newItemForm}
            onAdd={handleAdd}
            renderEditRow={renderEditRow}
            onStartEdit={handleStartEdit}
            onSaveEdit={handleSaveEdit}
        />
    )
}

export default function HeirPersonsPage() {
    return (
        <Suspense fallback={<div className="container mx-auto py-10 px-4"><p className="text-muted-foreground">読み込み中...</p></div>}>
            <HeirPersonsContent />
        </Suspense>
    )
}
