"use client"

import { Suspense, type KeyboardEvent } from "react"
import { AddressCell } from "@/components/AddressCell"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { SelectWithOther } from "@/components/ui/SelectWithOther"
import { MasterListPage, getMasterListPageProps, type ColumnDef } from "@/components/MasterListPage"
import { PersonAddressFields } from "@/components/person-master/PersonAddressFields"
import { useMasterList, nextTempId, type MasterListConfig } from "@/hooks/use-master-list"
import { createPersonMasterDraft, getPersonMasterEditingFields, getPersonMasterPayload } from "@/lib/person-master-utils"
import { formatPersonDeleteBlockedMessage } from "@/lib/person-delete-message"
import { personMatchesSearch } from "@/lib/person-search"
import { usePersonAddressEditing } from "@/hooks/use-person-address-editing"
import { RELATED_PARTY_PROFESSIONS } from "@/lib/constants/related-party-professions"
import type { RelatedPartyPerson } from "@/types/shared"
import type { CreateRelatedPartyPersonInput, UpdateRelatedPartyPersonInput } from "@/types/validation"
import { getRelatedPartyPersons, createRelatedPartyPerson, updateRelatedPartyPerson, deleteRelatedPartyPerson } from "@/lib/api/masters"
import { useToast } from "@/components/ui/Toast"
import { Check, X } from "lucide-react"
import { useState } from "react"

const COLUMNS: ColumnDef<RelatedPartyPerson>[] = [
    {
        key: "name",
        label: "氏名",
        width: "150px",
        cellClassName: "align-top",
        renderCell: (item) => (
            <div className="min-w-0 leading-tight">
                <div className="truncate text-sm font-medium">{item.name}</div>
                {item.nameKana && (
                    <div className="mt-0.5 truncate text-[11px] font-normal text-muted-foreground">{item.nameKana}</div>
                )}
            </div>
        ),
    },
    {
        key: "profession",
        label: "業種",
        width: "96px",
        renderCell: (item) =>
            item.profession ? (
                <span className="inline-flex items-center rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[11px]">{item.profession}</span>
            ) : (
                <span className="text-muted-foreground">-</span>
            ),
    },
    { key: "phone", label: "電話番号", width: "120px", cellClassName: "text-xs" },
    {
        key: "address",
        label: "住所",
        width: "240px",
        cellClassName: "align-top",
        renderCell: (item) => (
            <AddressCell
                postalCode={item.postalCode}
                address={item.address}
                addressFromPostalCode={item.addressFromPostalCode}
                addressManual={item.addressManual}
                className="max-w-[240px]"
            />
        ),
    },
    { key: "memo", label: "メモ", renderCell: (item) =>
        item.memo ? (
            <span className="text-xs text-muted-foreground truncate max-w-[140px] block">{item.memo}</span>
        ) : (
            <span className="text-muted-foreground">-</span>
        )
    },
]

const EDIT_INPUT_CLASS = "h-10 rounded-md border text-sm focus-visible:ring-1 focus-visible:ring-offset-0"

const MASTER_CONFIG: MasterListConfig<RelatedPartyPerson, CreateRelatedPartyPersonInput, UpdateRelatedPartyPersonInput> = {
    fetchAll: getRelatedPartyPersons,
    create: createRelatedPartyPerson,
    update: updateRelatedPartyPerson,
    remove: deleteRelatedPartyPerson,
    getCreatePayload: (item) => ({
        ...getPersonMasterPayload(item),
        profession: item.profession || "",
    }),
    getUpdatePayload: (item) => ({
        ...getPersonMasterPayload(item),
        profession: item.profession || "",
        active: item.active,
    }),
    entityLabel: "関係者",
    savedParam: "related-party-persons",
    sortFields: ["name", "profession", "phone", "address"],
    defaultSortField: "name",
    getSortValue: (item, field) => {
        switch (field) {
            case "name": return `${item.nameKana || item.name} ${item.name}`
            case "profession": return item.profession || ""
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
        return total > 0 ? formatPersonDeleteBlockedMessage(total, "関係者") : null
    },
}

function RelatedPartyPersonsContent() {
    const toast = useToast()
    const ml = useMasterList(MASTER_CONFIG)

    const [newName, setNewName] = useState("")
    const [newNameKana, setNewNameKana] = useState("")
    const [newProfession, setNewProfession] = useState("")
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
            profession: newProfession.trim(),
            active: true,
        })
        setNewName("")
        setNewNameKana("")
        setNewProfession("")
        setNewPhone("")
    }

    const handleStartEdit = (item: RelatedPartyPerson) => {
        ml.handleStartEdit(item, getPersonMasterEditingFields(item, { profession: item.profession }))
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
                    profession: (ml.editingFields.profession || "").trim(),
                }
            }
        )
    }

    const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleSaveEdit()
        if (e.key === "Escape") ml.handleCancelEdit()
    }

    const renderEditRow = (item: RelatedPartyPerson) => {
        const fieldId = (field: string) => `related-party-person-${item.id}-${field}`
        return (
            <div className="space-y-4 px-3 py-4">
                {/* セクション1: 基本情報 */}
                <section className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">基本情報</div>
                    <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_140px_160px]">
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
                            <Label htmlFor={fieldId("profession")} className="text-xs text-muted-foreground">業種</Label>
                            <SelectWithOther
                                id={fieldId("profession")}
                                options={RELATED_PARTY_PROFESSIONS}
                                value={ml.editingFields.profession || ""}
                                onChange={(v) => ml.setEditingFields(f => ({ ...f, profession: v }))}
                                placeholder="業種を選択"
                                otherPlaceholder="業種を入力"
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
                    </div>
                </section>

                {/* セクション2: 住所 */}
                <section className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">住所</div>
                    <div className="grid items-end gap-3 sm:grid-cols-[160px_1fr] lg:grid-cols-[160px_minmax(240px,1fr)_minmax(240px,1fr)]">
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
                        />
                    </div>
                </section>

                {/* セクション3: メモ + 操作 */}
                <section className="space-y-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">メモ</div>
                    <div className="space-y-1">
                        <Label htmlFor={fieldId("memo")} className="sr-only">メモ</Label>
                        <textarea
                            id={fieldId("memo")}
                            value={ml.editingFields.memo || ""}
                            onChange={(e) => ml.setEditingFields(f => ({ ...f, memo: e.target.value }))}
                            placeholder="自由記入（用途・連絡時の注意点など）"
                            rows={2}
                            className="block w-full resize-y rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[64px]"
                        />
                    </div>
                </section>

                {/* 操作ボタン */}
                <div className="flex items-center justify-end gap-2 border-t pt-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-9"
                        onClick={ml.handleCancelEdit}
                    >
                        <X className="h-4 w-4 mr-1" />
                        キャンセル
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        className="h-9"
                        onClick={handleSaveEdit}
                    >
                        <Check className="h-4 w-4 mr-1" />
                        保存
                    </Button>
                </div>
            </div>
        )
    }

    const newItemForm = (
        <div className="grid min-w-0 flex-1 items-end gap-3 md:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(150px,180px)_minmax(150px,180px)]">
            <div className="space-y-1">
                <Label htmlFor="related-party-person-new-name" className="text-xs text-muted-foreground">氏名</Label>
                <Input
                    id="related-party-person-new-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    placeholder="例: 田中 太郎"
                    className="h-10 text-sm w-full"
                />
            </div>
            <div className="space-y-1">
                <Label htmlFor="related-party-person-new-name-kana" className="text-xs text-muted-foreground">フリガナ</Label>
                <Input
                    id="related-party-person-new-name-kana"
                    value={newNameKana}
                    onChange={(e) => setNewNameKana(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    placeholder="例: タナカ タロウ"
                    className="h-10 text-sm w-full"
                />
            </div>
            <div className="space-y-1">
                <Label htmlFor="related-party-person-new-profession" className="text-xs text-muted-foreground">業種</Label>
                <SelectWithOther
                    id="related-party-person-new-profession"
                    options={RELATED_PARTY_PROFESSIONS}
                    value={newProfession}
                    onChange={setNewProfession}
                    placeholder="業種を選択"
                    otherPlaceholder="業種を入力"
                />
            </div>
            <div className="space-y-1">
                <Label htmlFor="related-party-person-new-phone" className="text-xs text-muted-foreground">電話番号</Label>
                <Input
                    id="related-party-person-new-phone"
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
        <MasterListPage<RelatedPartyPerson>
            {...getMasterListPageProps(ml)}
            title="関係者マスタ管理"
            entityLabel="関係者"
            columns={COLUMNS}
            searchPlaceholder="氏名・フリガナ・業種・電話番号・住所で検索"
            newItemForm={newItemForm}
            onAdd={handleAdd}
            renderEditRow={renderEditRow}
            onStartEdit={handleStartEdit}
            onSaveEdit={handleSaveEdit}
        />
    )
}

export default function RelatedPartyPersonsPage() {
    return (
        <Suspense fallback={<div className="container mx-auto py-10 px-4"><p className="text-muted-foreground">読み込み中...</p></div>}>
            <RelatedPartyPersonsContent />
        </Suspense>
    )
}
