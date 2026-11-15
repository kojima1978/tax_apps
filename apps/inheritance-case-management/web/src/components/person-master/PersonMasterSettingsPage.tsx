"use client"

import { useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { MasterListPage, getMasterListPageProps, type ColumnDef } from "@/components/MasterListPage"
import type { PersonAddressFieldsProps } from "@/components/person-master/PersonAddressFields"
import { useToast } from "@/components/ui/Toast"
import { useMasterList, nextTempId, type MasterListConfig } from "@/hooks/use-master-list"
import { usePersonAddressEditing } from "@/hooks/use-person-address-editing"
import { formatPersonDeleteBlockedMessage } from "@/lib/person-delete-message"
import {
    createPersonMasterDraft,
    getPersonMasterEditingFields,
    getPersonMasterPayload,
    type PersonMasterFields,
    type PersonMasterPayload,
} from "@/lib/person-master-utils"
import { personMatchesSearch } from "@/lib/person-search"

/**
 * 設定の「相続人」「関係者」のような人物マスタの画面。
 * 2画面で違うのは、列・氏名と電話のほかに持つ1項目（生年月日／業種）・文言・編集行のレイアウトだけなので、
 * それを設定として受け取り、追加・編集・保存の流れはここ1か所に置く。
 */

export interface PersonMasterItem extends PersonMasterFields {
    id: number
    active: boolean
    name: string
    nameKana: string
    phone: string
    postalCode: string
    address: string
    addressFromPostalCode: string
    addressManual: string
    memo: string
    _count?: { caseLinks: number }
}

type PersonMasterRole = Parameters<typeof formatPersonDeleteBlockedMessage>[1]

/** 氏名・フリガナ・電話・住所・メモのほかに持つ1項目（相続人は生年月日、関係者は業種）。 */
export interface PersonExtraField {
    key: string
    label: string
    /** 追加欄にも出すか（業種は出す・生年月日は編集でだけ入れる）。 */
    inNewForm: boolean
    /** 入力値を保存する形へ寄せる（空の生年月日は null、業種は前後の空白を落とす）。 */
    normalize: (raw: string | null | undefined) => string | null
    renderInput: (props: { id: string; value: string; onChange: (value: string) => void }) => ReactNode
}

type PersonMasterApi<T, E> = {
    fetchAll: () => Promise<T[]>
    create: (data: PersonMasterPayload & E) => Promise<T>
    update: (id: number, data: PersonMasterPayload & E & { active: boolean }) => Promise<T>
    remove: (id: number) => Promise<void>
}

export function createPersonMasterConfig<T extends PersonMasterItem, E extends object>({
    api,
    entityLabel,
    savedParam,
    sortFields,
    getExtraPayload,
}: {
    api: PersonMasterApi<T, E>
    entityLabel: NonNullable<PersonMasterRole>
    savedParam: string
    sortFields: string[]
    getExtraPayload: (item: T) => E
}): MasterListConfig<T, PersonMasterPayload & E, PersonMasterPayload & E & { active: boolean }> {
    return {
        ...api,
        getCreatePayload: (item) => ({ ...getPersonMasterPayload(item), ...getExtraPayload(item) }),
        getUpdatePayload: (item) => ({ ...getPersonMasterPayload(item), ...getExtraPayload(item), active: item.active }),
        entityLabel,
        savedParam,
        sortFields,
        defaultSortField: "name",
        getSortValue: (item, field) => {
            if (field === "name") return `${item.nameKana || item.name} ${item.name}`
            const value = (item as unknown as Record<string, unknown>)[field]
            return typeof value === "string" ? value : ""
        },
        matchesSearch: personMatchesSearch,
        getDeleteLabel: (item) => item.name,
        getPermanentDeleteBlockMessage: (item) => {
            const total = item._count?.caseLinks ?? 0
            return total > 0 ? formatPersonDeleteBlockedMessage(total, entityLabel) : null
        },
    }
}

/** 編集行のレイアウトは画面ごとに描く。値の出し入れと保存・取消はここから受け取る。 */
export interface PersonEditRowContext {
    fieldId: (field: string) => string
    /** 1つの欄の id・値・変更処理。Input にも textarea にも広げて使える。 */
    bind: (field: string) => {
        id: string
        value: string
        onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
    }
    /** Enter で保存、Escape で取消。 */
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
    extraInput: ReactNode
    addressFieldsProps: Omit<PersonAddressFieldsProps, "inputClassName">
    save: () => void
    cancel: () => void
}

const NEW_FORM_GRID_CLASS: Record<number, string> = {
    3: "md:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(150px,180px)]",
    4: "md:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(150px,180px)_minmax(150px,180px)]",
}

interface PersonMasterSettingsPageProps<T extends PersonMasterItem, C, U> {
    config: MasterListConfig<T, C, U>
    title: string
    /** 欄の id の接頭辞（例: heir-person）。 */
    idPrefix: string
    columns: ColumnDef<T>[]
    searchPlaceholder: string
    newPlaceholders: { name: string; nameKana: string }
    extraField: PersonExtraField
    renderEditRow: (ctx: PersonEditRowContext) => ReactNode
    renderListToolbar?: (items: T[]) => ReactNode
}

type NewFormField = {
    key: string
    idSuffix: string
    label: string
    render: PersonExtraField["renderInput"]
}

export function PersonMasterSettingsPage<T extends PersonMasterItem, C, U>({
    config,
    title,
    idPrefix,
    columns,
    searchPlaceholder,
    newPlaceholders,
    extraField,
    renderEditRow,
    renderListToolbar,
}: PersonMasterSettingsPageProps<T, C, U>) {
    const toast = useToast()
    const ml = useMasterList(config)
    const addressEditing = usePersonAddressEditing(ml.setEditingFields)
    const [newValues, setNewValues] = useState<Record<string, string>>({})

    function handleAdd() {
        const name = (newValues.name ?? "").trim()
        if (!name) {
            toast.warning("氏名を入力してください")
            return
        }
        ml.handleAdd({
            id: nextTempId(),
            ...createPersonMasterDraft({ name, nameKana: newValues.nameKana ?? "", phone: newValues.phone ?? "" }),
            [extraField.key]: extraField.normalize(extraField.inNewForm ? newValues[extraField.key] : ""),
            active: true,
        } as unknown as T)
        setNewValues({})
    }

    const textInput = (placeholder: string): NewFormField["render"] => ({ id, value, onChange }) => (
        <Input
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder={placeholder}
            className="h-10 text-sm w-full"
        />
    )
    const newFormFields: NewFormField[] = [
        { key: "name", idSuffix: "name", label: "氏名", render: textInput(newPlaceholders.name) },
        { key: "nameKana", idSuffix: "name-kana", label: "フリガナ", render: textInput(newPlaceholders.nameKana) },
        ...(extraField.inNewForm
            ? [{ key: extraField.key, idSuffix: extraField.key, label: extraField.label, render: extraField.renderInput }]
            : []),
        { key: "phone", idSuffix: "phone", label: "電話番号", render: textInput("03-1234-5678") },
    ]

    const handleStartEdit = (item: T) => {
        const extraValue = (item as unknown as Record<string, string | null | undefined>)[extraField.key]
        ml.handleStartEdit(item, getPersonMasterEditingFields(item, { [extraField.key]: extraValue }))
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
                ...getPersonMasterPayload(ml.editingFields),
                [extraField.key]: extraField.normalize(ml.editingFields[extraField.key]),
            }),
        )
    }

    const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleSaveEdit()
        if (e.key === "Escape") ml.handleCancelEdit()
    }

    const renderPersonEditRow = (item: T) => {
        const fieldId = (field: string) => `${idPrefix}-${item.id}-${field}`
        const fields = ml.editingFields
        const setField = (field: string, value: string) => ml.setEditingFields(f => ({ ...f, [field]: value }))
        return renderEditRow({
            fieldId,
            bind: (field) => ({
                id: fieldId(field),
                value: fields[field] || "",
                onChange: (e) => setField(field, e.target.value),
            }),
            onKeyDown: handleEditKeyDown,
            extraInput: extraField.renderInput({
                id: fieldId(extraField.key),
                value: fields[extraField.key] || "",
                onChange: (value) => setField(extraField.key, value),
            }),
            addressFieldsProps: {
                fieldId,
                postalCode: fields.postalCode || "",
                addressFromPostalCode: fields.addressFromPostalCode || "",
                addressManual: fields.addressManual || "",
                isSearching: addressEditing.isAddressSearching,
                isSearchingPostal: addressEditing.isPostalSearching,
                onPostalCodeChange: addressEditing.handlePostalCodeChange,
                onSearchPostalCode: () => addressEditing.searchAddressByPostalCode(fields.postalCode || ""),
                onSearchPostalCodeByAddress: () => addressEditing.searchPostalCodeByAddress(fields),
                onAddressFromPostalCodeChange: addressEditing.updateAddressFromPostalCode,
                onAddressManualChange: addressEditing.updateAddressManual,
                onKeyDown: handleEditKeyDown,
            },
            save: handleSaveEdit,
            cancel: ml.handleCancelEdit,
        })
    }

    const newItemForm = (
        <div className={`grid min-w-0 flex-1 items-end gap-3 ${NEW_FORM_GRID_CLASS[newFormFields.length]}`}>
            {newFormFields.map((field) => {
                const id = `${idPrefix}-new-${field.idSuffix}`
                return (
                    <div key={field.key} className="space-y-1">
                        <Label htmlFor={id} className="text-xs text-muted-foreground">{field.label}</Label>
                        {field.render({
                            id,
                            value: newValues[field.key] ?? "",
                            onChange: (value) => setNewValues(v => ({ ...v, [field.key]: value })),
                        })}
                    </div>
                )
            })}
        </div>
    )

    return (
        <MasterListPage<T>
            {...getMasterListPageProps(ml)}
            title={title}
            entityLabel={config.entityLabel}
            columns={columns}
            searchPlaceholder={searchPlaceholder}
            newItemForm={newItemForm}
            onAdd={handleAdd}
            renderEditRow={renderPersonEditRow}
            onStartEdit={handleStartEdit}
            onSaveEdit={handleSaveEdit}
            listToolbar={renderListToolbar?.(ml.filteredAndSortedItems)}
        />
    )
}
