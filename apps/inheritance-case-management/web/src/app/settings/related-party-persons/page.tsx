"use client"

import { Suspense } from "react"
import { Check, X } from "lucide-react"
import { AddressCell } from "@/components/AddressCell"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { SelectWithOther } from "@/components/ui/SelectWithOther"
import type { ColumnDef } from "@/components/MasterListPage"
import { PersonAddressFields } from "@/components/person-master/PersonAddressFields"
import {
    PersonMasterSettingsPage,
    createPersonMasterConfig,
    type PersonEditRowContext,
    type PersonExtraField,
} from "@/components/person-master/PersonMasterSettingsPage"
import { getRelatedPartyPersons, createRelatedPartyPerson, updateRelatedPartyPerson, deleteRelatedPartyPerson } from "@/lib/api/masters"
import { RELATED_PARTY_PROFESSIONS } from "@/lib/constants/related-party-professions"
import type { RelatedPartyPerson } from "@/types/shared"

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
const SECTION_HEADING_CLASS = "text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"

const MASTER_CONFIG = createPersonMasterConfig({
    api: {
        fetchAll: getRelatedPartyPersons,
        create: createRelatedPartyPerson,
        update: updateRelatedPartyPerson,
        remove: deleteRelatedPartyPerson,
    },
    entityLabel: "関係者",
    savedParam: "related-party-persons",
    sortFields: ["name", "profession", "phone", "address"],
    getExtraPayload: (item: RelatedPartyPerson) => ({ profession: item.profession || "" }),
})

/** 業種は追加欄でも選べる（選択肢にないものは「その他」から手入力）。 */
const PROFESSION_FIELD: PersonExtraField = {
    key: "profession",
    label: "業種",
    inNewForm: true,
    normalize: (raw) => (raw || "").trim(),
    renderInput: ({ id, value, onChange }) => (
        <SelectWithOther
            id={id}
            options={RELATED_PARTY_PROFESSIONS}
            value={value}
            onChange={onChange}
            placeholder="業種を選択"
            otherPlaceholder="業種を入力"
        />
    ),
}

function renderEditRow({ fieldId, bind, onKeyDown, extraInput, addressFieldsProps, save, cancel }: PersonEditRowContext) {
    return (
        <div className="space-y-4 px-3 py-4">
            <section className="space-y-2">
                <div className={SECTION_HEADING_CLASS}>基本情報</div>
                <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_140px_160px]">
                    <div className="space-y-1">
                        <Label htmlFor={fieldId("name")} className="text-xs text-muted-foreground">氏名</Label>
                        <Input {...bind("name")} onKeyDown={onKeyDown} placeholder="氏名" className={EDIT_INPUT_CLASS} autoFocus />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor={fieldId("nameKana")} className="text-xs text-muted-foreground">フリガナ</Label>
                        <Input {...bind("nameKana")} onKeyDown={onKeyDown} placeholder="ヤマダ ハナコ" className={EDIT_INPUT_CLASS} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor={fieldId("profession")} className="text-xs text-muted-foreground">業種</Label>
                        {extraInput}
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor={fieldId("phone")} className="text-xs text-muted-foreground">電話番号</Label>
                        <Input {...bind("phone")} onKeyDown={onKeyDown} placeholder="03-1234-5678" className={EDIT_INPUT_CLASS} />
                    </div>
                </div>
            </section>

            <section className="space-y-2">
                <div className={SECTION_HEADING_CLASS}>住所</div>
                <div className="grid items-end gap-3 sm:grid-cols-[160px_1fr] lg:grid-cols-[160px_minmax(240px,1fr)_minmax(240px,1fr)]">
                    <PersonAddressFields {...addressFieldsProps} inputClassName={EDIT_INPUT_CLASS} />
                </div>
            </section>

            <section className="space-y-2">
                <div className={SECTION_HEADING_CLASS}>メモ</div>
                <div className="space-y-1">
                    <Label htmlFor={fieldId("memo")} className="sr-only">メモ</Label>
                    <textarea
                        {...bind("memo")}
                        placeholder="自由記入（用途・連絡時の注意点など）"
                        rows={2}
                        className="block w-full resize-y rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[64px]"
                    />
                </div>
            </section>

            <div className="flex items-center justify-end gap-2 border-t pt-3">
                <Button variant="ghost" size="sm" className="h-9" onClick={cancel}>
                    <X className="h-4 w-4 mr-1" />
                    キャンセル
                </Button>
                <Button variant="default" size="sm" className="h-9" onClick={save}>
                    <Check className="h-4 w-4 mr-1" />
                    保存
                </Button>
            </div>
        </div>
    )
}

export default function RelatedPartyPersonsPage() {
    return (
        <Suspense fallback={<div className="container mx-auto py-10 px-4"><p className="text-muted-foreground">読み込み中...</p></div>}>
            <PersonMasterSettingsPage
                config={MASTER_CONFIG}
                title="関係者"
                idPrefix="related-party-person"
                columns={COLUMNS}
                searchPlaceholder="氏名・フリガナ・業種・電話番号・住所で検索"
                newPlaceholders={{ name: "例: 田中 太郎", nameKana: "例: タナカ タロウ" }}
                extraField={PROFESSION_FIELD}
                renderEditRow={renderEditRow}
            />
        </Suspense>
    )
}
