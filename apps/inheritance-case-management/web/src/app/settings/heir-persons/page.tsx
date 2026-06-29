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
import { exportHeirPersonsToCSV } from "@/lib/export-csv"
import { getHeirPersonRelatedCaseNames } from "@/lib/api/heir-persons"
import { Check, Download, X } from "lucide-react"
import { useCallback, useState } from "react"
import { RelatedCasesPopover } from "./RelatedCasesPopover"

const COLUMNS: ColumnDef<HeirPerson>[] = [
    {
        key: "name",
        label: "氏名",
        width: "190px",
        cellClassName: "align-top",
        renderCell: (item) => (
            <div className="min-w-0 leading-tight">
                {item.nameKana && (
                    <div className="truncate text-[11px] font-normal text-muted-foreground">{item.nameKana}</div>
                )}
                <div className="truncate font-medium">{item.name}</div>
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
    const [isExporting, setIsExporting] = useState(false)
    const addressEditing = usePersonAddressEditing(ml.setEditingFields)

    const handleExportCSV = useCallback(async () => {
        setIsExporting(true)
        try {
            const persons = ml.filteredAndSortedItems
            const withCases = persons.filter(p => (p._count?.caseLinks ?? 0) > 0)
            const relatedCaseNames = new Map<number, string[]>()

            if (withCases.length > 0) {
                const result = await getHeirPersonRelatedCaseNames(withCases.map(p => p.id))
                for (const person of withCases) {
                    relatedCaseNames.set(person.id, result[person.id] ?? [])
                }
            }

            exportHeirPersonsToCSV(persons, relatedCaseNames)
        } catch {
            toast.error("CSV出力に失敗しました")
        } finally {
            setIsExporting(false)
        }
    }, [ml.filteredAndSortedItems, toast])

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
            <div className="py-3 px-2">
                <div className="max-w-[740px] mx-auto rounded-lg border shadow-sm bg-background">
                    <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 rounded-t-lg">
                        <span className="text-xs font-medium text-muted-foreground">人物情報を編集</span>
                        <div className="flex items-center gap-1.5">
                            <Button variant="outline" size="sm" className="h-7 px-3 text-xs rounded" onClick={handleSaveEdit} title="保存">
                                <Check className="h-3 w-3 mr-1" />保存
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded text-muted-foreground hover:text-foreground" onClick={ml.handleCancelEdit} title="キャンセル">
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                    <div className="px-4 py-3 space-y-3">
                        <div className="grid items-end gap-x-4 gap-y-1.5 sm:grid-cols-2">
                            <div className="space-y-0.5">
                                <Label htmlFor={fieldId("nameKana")} className="text-[10px] text-muted-foreground">フリガナ</Label>
                                <Input
                                    id={fieldId("nameKana")}
                                    value={ml.editingFields.nameKana || ""}
                                    onChange={(e) => ml.setEditingFields(f => ({ ...f, nameKana: e.target.value }))}
                                    onKeyDown={handleEditKeyDown}
                                    placeholder="ヤマダ ハナコ"
                                    className="h-6 rounded border text-xs focus-visible:ring-1 focus-visible:ring-offset-0"
                                    autoFocus
                                />
                            </div>
                            <div className="space-y-0.5">
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
                            <div className="space-y-0.5">
                                <Label htmlFor={fieldId("name")} className="text-xs text-muted-foreground">氏名</Label>
                                <Input
                                    id={fieldId("name")}
                                    value={ml.editingFields.name || ""}
                                    onChange={(e) => ml.setEditingFields(f => ({ ...f, name: e.target.value }))}
                                    onKeyDown={handleEditKeyDown}
                                    placeholder="山田 花子"
                                    className={EDIT_INPUT_CLASS}
                                />
                            </div>
                            <div className="space-y-0.5">
                                <Label htmlFor={fieldId("dateOfBirth")} className="text-xs text-muted-foreground">生年月日</Label>
                                <JpDateInput
                                    id={fieldId("dateOfBirth")}
                                    value={ml.editingFields.dateOfBirth || ""}
                                    onChange={(v) => ml.setEditingFields(f => ({ ...f, dateOfBirth: v }))}
                                />
                            </div>
                        </div>
                        <hr className="border-muted" />
                        <div className="grid items-end gap-x-4 gap-y-1.5 sm:grid-cols-2">
                            <PersonAddressFields
                                fieldId={fieldId}
                                postalCode={ml.editingFields.postalCode || ""}
                                addressFromPostalCode={ml.editingFields.addressFromPostalCode || ""}
                                addressManual={ml.editingFields.addressManual || ""}
                                inputClassName={EDIT_INPUT_CLASS}
                                isSearching={addressEditing.isAddressSearching}
                                isSearchingPostal={addressEditing.isPostalSearching}
                                onPostalCodeChange={addressEditing.handlePostalCodeChange}
                                onSearchPostalCode={() => addressEditing.searchAddressByPostalCode(ml.editingFields.postalCode || "")}
                                onSearchPostalCodeByAddress={() => addressEditing.searchPostalCodeByAddress(ml.editingFields)}
                                onAddressFromPostalCodeChange={addressEditing.updateAddressFromPostalCode}
                                onAddressManualChange={addressEditing.updateAddressManual}
                                onKeyDown={handleEditKeyDown}
                                searchButtonClassName="h-10 w-10 shrink-0 rounded"
                                addressManualFieldClassName="sm:col-span-2"
                                addressManualLabel="住所補足（番地・建物名など手入力）"
                            />
                        </div>
                        <hr className="border-muted" />
                        <div className="space-y-0.5">
                            <Label htmlFor={fieldId("memo")} className="text-xs text-muted-foreground">メモ</Label>
                            <textarea
                                id={fieldId("memo")}
                                value={ml.editingFields.memo || ""}
                                onChange={(e) => ml.setEditingFields(f => ({ ...f, memo: e.target.value }))}
                                placeholder="備考・メールアドレス等"
                                rows={2}
                                className="w-full border rounded px-2.5 py-1.5 text-sm bg-background resize-y focus:outline-none focus:ring-1 focus:ring-primary min-h-[40px]"
                            />
                        </div>
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
            listToolbar={
                <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-xs rounded"
                    disabled={isExporting}
                    onClick={() => { void handleExportCSV() }}
                >
                    <Download className="h-3 w-3 mr-1" />{isExporting ? "出力中..." : "CSV出力"}
                </Button>
            }
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
