"use client"

import { Suspense, useCallback, useState } from "react"
import { Check, Download, X } from "lucide-react"
import { AddressCell } from "@/components/AddressCell"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { JpDateInput } from "@/components/ui/JpDateInput"
import { Label } from "@/components/ui/Label"
import type { ColumnDef } from "@/components/MasterListPage"
import { PersonAddressFields } from "@/components/person-master/PersonAddressFields"
import {
    PersonMasterSettingsPage,
    createPersonMasterConfig,
    type PersonEditRowContext,
    type PersonExtraField,
} from "@/components/person-master/PersonMasterSettingsPage"
import { useToast } from "@/components/ui/Toast"
import { getHeirPersons, createHeirPerson, updateHeirPerson, deleteHeirPerson } from "@/lib/api/masters"
import { getHeirPersonRelatedCaseNames } from "@/lib/api/heir-persons"
import { exportHeirPersonsToCSV } from "@/lib/export-csv"
import { formatWareki } from "@/lib/japanese-era"
import type { HeirPerson } from "@/types/shared"
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

const MASTER_CONFIG = createPersonMasterConfig({
    api: { fetchAll: getHeirPersons, create: createHeirPerson, update: updateHeirPerson, remove: deleteHeirPerson },
    entityLabel: "相続人",
    savedParam: "heir-persons",
    sortFields: ["name", "phone", "address"],
    getExtraPayload: (item: HeirPerson) => ({ dateOfBirth: item.dateOfBirth || null }),
})

/** 生年月日は編集でだけ入れる（追加欄には出さない）。 */
const DATE_OF_BIRTH_FIELD: PersonExtraField = {
    key: "dateOfBirth",
    label: "生年月日",
    inNewForm: false,
    normalize: (raw) => raw?.trim() || null,
    renderInput: ({ id, value, onChange }) => (
        <JpDateInput defaultEra="showa" id={id} value={value} onChange={onChange} />
    ),
}

function renderEditRow({ fieldId, bind, onKeyDown, extraInput, addressFieldsProps, save, cancel }: PersonEditRowContext) {
    return (
        <div className="py-3 px-2">
            <div className="max-w-[740px] mx-auto rounded-lg border shadow-sm bg-background">
                <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 rounded-t-lg">
                    <span className="text-xs font-medium text-muted-foreground">人物情報を編集</span>
                    <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="sm" className="h-7 px-3 text-xs rounded" onClick={save} title="保存">
                            <Check className="h-3 w-3 mr-1" />保存
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded text-muted-foreground hover:text-foreground" onClick={cancel} title="キャンセル">
                            <X className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
                <div className="px-4 py-3 space-y-3">
                    <div className="grid items-end gap-x-4 gap-y-1.5 sm:grid-cols-2">
                        <div className="space-y-0.5">
                            <Label htmlFor={fieldId("nameKana")} className="text-[11px] text-muted-foreground">フリガナ</Label>
                            <Input
                                {...bind("nameKana")}
                                onKeyDown={onKeyDown}
                                placeholder="ヤマダ ハナコ"
                                className="h-6 rounded border text-xs focus-visible:ring-1 focus-visible:ring-offset-0"
                                autoFocus
                            />
                        </div>
                        <div className="space-y-0.5">
                            <Label htmlFor={fieldId("phone")} className="text-xs text-muted-foreground">電話番号</Label>
                            <Input {...bind("phone")} onKeyDown={onKeyDown} placeholder="03-1234-5678" className={EDIT_INPUT_CLASS} />
                        </div>
                        <div className="space-y-0.5">
                            <Label htmlFor={fieldId("name")} className="text-xs text-muted-foreground">氏名</Label>
                            <Input {...bind("name")} onKeyDown={onKeyDown} placeholder="山田 花子" className={EDIT_INPUT_CLASS} />
                        </div>
                        <div className="space-y-0.5">
                            <Label htmlFor={fieldId("dateOfBirth")} className="text-xs text-muted-foreground">生年月日</Label>
                            {extraInput}
                        </div>
                    </div>
                    <hr className="border-muted" />
                    <div className="grid items-end gap-x-4 gap-y-1.5 sm:grid-cols-2">
                        <PersonAddressFields
                            {...addressFieldsProps}
                            inputClassName={EDIT_INPUT_CLASS}
                            searchButtonClassName="h-10 w-10 shrink-0 rounded"
                            addressManualFieldClassName="sm:col-span-2"
                            addressManualLabel="住所補足（番地・建物名など手入力）"
                        />
                    </div>
                    <hr className="border-muted" />
                    <div className="space-y-0.5">
                        <Label htmlFor={fieldId("memo")} className="text-xs text-muted-foreground">メモ</Label>
                        <textarea
                            {...bind("memo")}
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

/** 絞り込み・並び替え後の一覧を、関連案件の名前つきで CSV に書き出す。 */
function HeirPersonsCsvButton({ persons }: { persons: HeirPerson[] }) {
    const toast = useToast()
    const [isExporting, setIsExporting] = useState(false)

    const handleExportCSV = useCallback(async () => {
        setIsExporting(true)
        try {
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
    }, [persons, toast])

    return (
        <Button
            variant="outline"
            size="sm"
            className="h-7 px-3 text-xs rounded"
            disabled={isExporting}
            onClick={() => { void handleExportCSV() }}
        >
            <Download className="h-3 w-3 mr-1" />{isExporting ? "出力中..." : "CSV出力"}
        </Button>
    )
}

export default function HeirPersonsPage() {
    return (
        <Suspense fallback={<div className="container mx-auto py-10 px-4"><p className="text-muted-foreground">読み込み中...</p></div>}>
            <PersonMasterSettingsPage
                config={MASTER_CONFIG}
                title="相続人"
                idPrefix="heir-person"
                columns={COLUMNS}
                searchPlaceholder="氏名・フリガナ・電話番号・住所で検索"
                newPlaceholders={{ name: "例: 山田 花子", nameKana: "例: ヤマダ ハナコ" }}
                extraField={DATE_OF_BIRTH_FIELD}
                renderEditRow={renderEditRow}
                renderListToolbar={(persons) => <HeirPersonsCsvButton persons={persons} />}
            />
        </Suspense>
    )
}
