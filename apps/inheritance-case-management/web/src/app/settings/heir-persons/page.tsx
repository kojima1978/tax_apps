"use client"

import { Suspense, type KeyboardEvent } from "react"
import { AddressCell } from "@/components/AddressCell"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { JpDateInput } from "@/components/ui/JpDateInput"
import { Label } from "@/components/ui/Label"
import { MasterListPage, getMasterListPageProps, type ColumnDef } from "@/components/MasterListPage"
import { PersonAddressFields } from "@/components/person-master/PersonAddressFields"
import { useMasterList, nextTempId, type MasterListConfig } from "@/hooks/use-master-list"
import { formatWareki } from "@/lib/japanese-era"
import { createPersonMasterDraft, getPersonMasterEditingFields, getPersonMasterPayload } from "@/lib/person-master-utils"
import { formatPersonDeleteBlockedMessage } from "@/lib/person-delete-message"
import { personMatchesSearch } from "@/lib/person-search"
import { usePersonAddressEditing } from "@/hooks/use-person-address-editing"
import type { HeirPerson } from "@/types/shared"
import type { CreateHeirPersonInput, UpdateHeirPersonInput } from "@/types/validation"
import { getHeirPersons, createHeirPerson, updateHeirPerson, deleteHeirPerson } from "@/lib/api/masters"
import { useToast } from "@/components/ui/Toast"
import { Check, X } from "lucide-react"
import { useState } from "react"
import { RelatedCasesPopover } from "./RelatedCasesPopover"

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
    {
        key: "dateOfBirth",
        label: "生年月日",
        width: "150px",
        renderCell: (item) => item.dateOfBirth ? (
            <span className="text-sm">{formatWareki(item.dateOfBirth)}</span>
        ) : (
            <span className="text-muted-foreground">-</span>
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
    {
        key: "relatedCases",
        label: "関連案件",
        width: "110px",
        renderCell: (item) => (
            <RelatedCasesPopover
                personId={item.id}
                count={item._count?.caseLinks ?? 0}
                personName={item.name}
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
        ...getPersonMasterPayload(item),
        dateOfBirth: item.dateOfBirth || null,
    }),
    getUpdatePayload: (item) => ({
        ...getPersonMasterPayload(item),
        dateOfBirth: item.dateOfBirth || null,
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
    const addressEditing = usePersonAddressEditing(ml.setEditingFields)

    const handleAdd = () => {
        const name = newName.trim()
        if (!name) {
            toast.warning("氏名を入力してください")
            return
        }
        ml.handleAdd({
            id: nextTempId(),
            ...createPersonMasterDraft({ name, nameKana: newNameKana, phone: newPhone }),
            dateOfBirth: null,
            active: true,
        })
        setNewName("")
        setNewNameKana("")
        setNewPhone("")
    }

    const handleStartEdit = (item: HeirPerson) => {
        ml.handleStartEdit(item, getPersonMasterEditingFields(item, { dateOfBirth: item.dateOfBirth }))
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
                return {
                    ...item,
                    ...getPersonMasterPayload(ml.editingFields),
                    dateOfBirth: ml.editingFields.dateOfBirth?.trim() || null,
                }
            }
        )
    }

    const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleSaveEdit()
        if (e.key === "Escape") ml.handleCancelEdit()
    }

    const renderEditRow = (item: HeirPerson) => {
        const fieldId = (field: string) => `heir-person-${item.id}-${field}`
        return (
            <div className="px-2 py-3">
                <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[160px_minmax(240px,1fr)_minmax(240px,1fr)]">
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
                    <div className="space-y-1 sm:col-span-2 lg:col-span-3 lg:col-start-1 lg:row-start-2">
                        <Label htmlFor={fieldId("dateOfBirth")} className="text-xs text-muted-foreground">生年月日</Label>
                        <JpDateInput
                            id={fieldId("dateOfBirth")}
                            value={ml.editingFields.dateOfBirth || ""}
                            onChange={(v) => ml.setEditingFields(f => ({ ...f, dateOfBirth: v }))}
                        />
                    </div>
                    <PersonAddressFields
                        fieldId={fieldId}
                        postalCode={ml.editingFields.postalCode || ""}
                        addressFromPostalCode={ml.editingFields.addressFromPostalCode || ""}
                        addressManual={ml.editingFields.addressManual || ""}
                        inputClassName={EDIT_INPUT_CLASS}
                        isSearching={addressEditing.isAddressSearching}
                        onPostalCodeChange={addressEditing.handlePostalCodeChange}
                        onSearchPostalCode={() => addressEditing.searchAddressByPostalCode(ml.editingFields.postalCode || "")}
                        onAddressFromPostalCodeChange={addressEditing.updateAddressFromPostalCode}
                        onAddressManualChange={addressEditing.updateAddressManual}
                        onKeyDown={handleEditKeyDown}
                        postalCodeFieldClassName="lg:col-start-1 lg:row-start-3"
                        addressFromPostalCodeFieldClassName="sm:col-span-2 lg:col-span-2 lg:col-start-2 lg:row-start-3"
                        addressManualFieldClassName="sm:col-span-2 lg:col-span-3 lg:col-start-1 lg:row-start-4"
                        addressManualLabel="住所補足（番地・建物名など手入力）"
                    />
                    <div className="space-y-1 sm:col-span-2 lg:col-span-2 lg:col-start-1 lg:row-start-5">
                        <Label htmlFor={fieldId("memo")} className="text-xs text-muted-foreground">メモ</Label>
                        <textarea
                            id={fieldId("memo")}
                            value={ml.editingFields.memo || ""}
                            onChange={(e) => ml.setEditingFields(f => ({ ...f, memo: e.target.value }))}
                            placeholder="備考・メールアドレス等"
                            rows={3}
                            className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-y focus:outline-none focus:ring-1 focus:ring-primary min-h-[56px]"
                        />
                    </div>
                    <div className="flex items-end justify-end gap-1 sm:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-start-5">
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
