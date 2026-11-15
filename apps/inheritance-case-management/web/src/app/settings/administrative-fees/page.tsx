"use client"

import { Suspense, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react"
import { Download, Upload } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { CurrencyField } from "@/components/ui/CurrencyField"
import { MasterListPage, getMasterListPageProps, type ColumnDef } from "@/components/MasterListPage"
import { useMasterList, nextTempId, type MasterListConfig } from "@/hooks/use-master-list"
import { useToast } from "@/components/ui/Toast"
import { formatCurrency } from "@/lib/analytics-utils"
import { exportFileName } from "@/lib/export-filename"
import {
    ADMINISTRATIVE_FEE_EXCEL_SHEET_NAME,
    administrativeFeeItemsToSheetRows,
    parseAdministrativeFeeSheetRows,
} from "@/lib/administrative-fee-excel"
import {
    ADMINISTRATIVE_FEE_CATEGORIES,
    ADMINISTRATIVE_FEE_NOTES,
    administrativeFeeCategoryOrder,
} from "@/lib/constants/administrative-fees"
import {
    getAdministrativeFeeItems,
    createAdministrativeFeeItem,
    updateAdministrativeFeeItem,
    deleteAdministrativeFeeItem,
    importAdministrativeFeeItems,
} from "@/lib/api/administrative-fee-items"
import type { AdministrativeFeeItem } from "@/types/shared"
import type { CreateAdministrativeFeeItemInput, UpdateAdministrativeFeeItemInput } from "@/types/validation"

// 分類は表の見出し行（groupBy）が受け持つので列には出さない。分類の付け替えは編集時の選択欄で行う
const COLUMNS: ColumnDef<AdministrativeFeeItem>[] = [
    { key: "name", label: "手続き内容", renderCell: (item) => <span className="text-sm">{item.name}</span> },
    {
        key: "unitPrice",
        label: "料金",
        width: "120px",
        cellClassName: "text-right tabular-nums",
        renderCell: (item) => <span className="text-sm font-medium">{formatCurrency(item.unitPrice)}</span>,
    },
    {
        key: "note",
        label: "備考",
        width: "260px",
        renderCell: (item) => item.note
            ? <span className="block max-w-[220px] truncate text-xs text-muted-foreground">{item.note}</span>
            : <span className="text-muted-foreground">-</span>,
    },
]

/** 並びは「分類の順 → 分類の中の順」。localeCompare で比べるので数字は桁をそろえる */
function categorySortKey(item: AdministrativeFeeItem): string {
    return `${String(item.categoryOrder).padStart(3, "0")}_${String(item.sortOrder).padStart(4, "0")}`
}

const MASTER_CONFIG: MasterListConfig<AdministrativeFeeItem, CreateAdministrativeFeeItemInput, UpdateAdministrativeFeeItemInput> = {
    fetchAll: getAdministrativeFeeItems,
    create: createAdministrativeFeeItem,
    update: updateAdministrativeFeeItem,
    remove: deleteAdministrativeFeeItem,
    getCreatePayload: (item) => ({
        category: item.category,
        name: item.name,
        unitPrice: item.unitPrice,
        note: item.note ?? null,
        sortOrder: item.sortOrder,
        categoryOrder: item.categoryOrder,
    }),
    getUpdatePayload: (item) => ({
        category: item.category,
        name: item.name,
        unitPrice: item.unitPrice,
        note: item.note ?? null,
        categoryOrder: administrativeFeeCategoryOrder(item.category),
        active: item.active,
    }),
    entityLabel: "料金表の行",
    savedParam: "administrative-fees",
    sortFields: ["category", "name", "unitPrice", "note"],
    defaultSortField: "category",
    // 並べ替えても分類の塊は崩さない（見出し行が1行ごとに挟まるのを防ぐため、必ず分類の順を先頭に付ける）
    getSortValue: (item, field) => {
        const group = String(item.categoryOrder).padStart(3, "0")
        switch (field) {
            case "category": return categorySortKey(item)
            case "name": return `${group}_${item.name}`
            case "unitPrice": return `${group}_${String(item.unitPrice).padStart(10, "0")}`
            case "note": return `${group}_${item.note ?? ""}`
            default: return group
        }
    },
    matchesSearch: (item, query) => {
        const q = query.toLowerCase()
        return [item.category, item.name, item.note ?? "", String(item.unitPrice)]
            .some(value => value.toLowerCase().includes(q))
    },
    getDeleteLabel: (item) => `${item.category} / ${item.name}`,
}

const EDIT_INPUT_CLASS = "h-10 rounded-md border text-sm focus-visible:ring-1 focus-visible:ring-offset-0"

function AdministrativeFeesContent() {
    const toast = useToast()
    const ml = useMasterList(MASTER_CONFIG)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isImporting, setIsImporting] = useState(false)

    const [newCategory, setNewCategory] = useState<string>(ADMINISTRATIVE_FEE_CATEGORIES[0])
    const [newName, setNewName] = useState("")
    const [newUnitPrice, setNewUnitPrice] = useState("")
    const [newNote, setNewNote] = useState("")

    /** 既定の分類＋いま登録されている分類（Excel で足された分類も選べるように） */
    const categories = useMemo(
        () => [...new Set([...ADMINISTRATIVE_FEE_CATEGORIES, ...ml.items.map(item => item.category)])].filter(Boolean),
        [ml.items],
    )

    const handleAdd = () => {
        const name = newName.trim()
        const category = newCategory.trim()
        if (!category) {
            toast.warning("手続き分類を選んでください")
            return
        }
        if (!name) {
            toast.warning("手続き内容を入力してください")
            return
        }
        const duplicate = ml.items.some(item => item.category === category && item.name === name)
        if (duplicate) {
            toast.warning("同じ分類に同じ手続き内容の行があります")
            return
        }
        const sortOrder = Math.max(
            0,
            ...ml.items.filter(item => item.category === category).map(item => item.sortOrder + 1),
        )
        ml.handleAdd({
            id: nextTempId(),
            category,
            categoryOrder: administrativeFeeCategoryOrder(category),
            name,
            unitPrice: Number(newUnitPrice) || 0,
            note: newNote.trim() || null,
            sortOrder,
            active: true,
        })
        setNewName("")
        setNewUnitPrice("")
        setNewNote("")
    }

    const handleStartEdit = (item: AdministrativeFeeItem) => {
        ml.handleStartEdit(item, {
            category: item.category,
            name: item.name,
            unitPrice: String(item.unitPrice),
            note: item.note ?? "",
        })
    }

    const handleSaveEdit = () => {
        ml.handleSaveEdit(
            () => {
                if (!ml.editingFields.category?.trim()) {
                    toast.warning("手続き分類を選んでください")
                    return false
                }
                if (!ml.editingFields.name?.trim()) {
                    toast.warning("手続き内容を入力してください")
                    return false
                }
                return true
            },
            (item) => {
                const category = (ml.editingFields.category || "").trim()
                return {
                    ...item,
                    category,
                    categoryOrder: administrativeFeeCategoryOrder(category),
                    name: (ml.editingFields.name || "").trim(),
                    unitPrice: Number(ml.editingFields.unitPrice) || 0,
                    note: (ml.editingFields.note || "").trim() || null,
                }
            },
        )
    }

    const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleSaveEdit()
        if (e.key === "Escape") ml.handleCancelEdit()
    }

    const handleExport = async () => {
        const XLSX = await import("xlsx-js-style")
        const rows = administrativeFeeItemsToSheetRows(
            [...ml.items].filter(item => item.active !== false).sort((a, b) => categorySortKey(a).localeCompare(categorySortKey(b))),
        )
        const worksheet = XLSX.utils.aoa_to_sheet(rows)
        worksheet["!cols"] = [{ wch: 22 }, { wch: 40 }, { wch: 12 }, { wch: 34 }]
        for (let column = 0; column < 4; column++) {
            const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: column })]
            if (cell) cell.s = { font: { bold: true }, fill: { fgColor: { rgb: "F1F5F9" } } }
        }
        for (let row = 1; row < rows.length; row++) {
            const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: 2 })]
            if (cell) cell.z = "#,##0"
        }
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, ADMINISTRATIVE_FEE_EXCEL_SHEET_NAME)
        XLSX.writeFile(workbook, exportFileName("行政書士料金表", "xlsx"))
    }

    const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file) return
        if (ml.isDirty) {
            toast.warning("保存していない変更があります。先に保存してから取り込んでください")
            return
        }
        setIsImporting(true)
        try {
            const XLSX = await import("xlsx-js-style")
            const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" })
            const sheet = workbook.Sheets[workbook.SheetNames[0]]
            if (!sheet) {
                toast.error("シートが読めませんでした")
                return
            }
            const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false, raw: true })
            const { items, errors } = parseAdministrativeFeeSheetRows(rows)
            if (errors.length > 0) {
                toast.error(`取り込めない行があります:\n${errors.slice(0, 5).join("\n")}${errors.length > 5 ? `\nほか${errors.length - 5}件` : ""}`)
                return
            }
            if (items.length === 0) {
                toast.warning("取り込む行がありませんでした")
                return
            }
            const result = await importAdministrativeFeeItems({ items })
            await ml.reload()
            toast.success(`取り込みました（追加 ${result.created}件 / 更新 ${result.updated}件 / 変更なし ${result.unchanged}件）`)
        } catch (error) {
            console.error(error)
            toast.error(error instanceof Error && error.message ? error.message : "取り込み中にエラーが発生しました")
        } finally {
            setIsImporting(false)
        }
    }

    const renderEditCell = (column: ColumnDef<AdministrativeFeeItem>) => {
        switch (column.key) {
            case "name":
                return (
                    <div className="flex min-w-0 items-center gap-2">
                        <select
                            aria-label="手続き分類"
                            value={ml.editingFields.category || ""}
                            onChange={(e) => ml.setEditingFields(f => ({ ...f, category: e.target.value }))}
                            className="flex h-10 w-[150px] shrink-0 rounded-md border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            {categories.map(category => <option key={category} value={category}>{category}</option>)}
                        </select>
                        <Input
                            aria-label="手続き内容"
                            value={ml.editingFields.name || ""}
                            onChange={(e) => ml.setEditingFields(f => ({ ...f, name: e.target.value }))}
                            onKeyDown={handleEditKeyDown}
                            className={EDIT_INPUT_CLASS}
                            autoFocus
                        />
                    </div>
                )
            case "unitPrice":
                return (
                    <CurrencyField
                        aria-label="料金"
                        value={ml.editingFields.unitPrice || undefined}
                        onValueChange={(value) => ml.setEditingFields(f => ({ ...f, unitPrice: value || "" }))}
                        className={`${EDIT_INPUT_CLASS} text-right tabular-nums`}
                    />
                )
            case "note":
                return (
                    <Input
                        aria-label="備考"
                        value={ml.editingFields.note || ""}
                        onChange={(e) => ml.setEditingFields(f => ({ ...f, note: e.target.value }))}
                        onKeyDown={handleEditKeyDown}
                        placeholder="備考"
                        className={EDIT_INPUT_CLASS}
                    />
                )
            default:
                return null
        }
    }

    const newItemForm = (
        <div className="grid min-w-0 flex-1 items-end gap-3 md:grid-cols-[minmax(150px,180px)_minmax(200px,1fr)_minmax(120px,140px)_minmax(150px,1fr)]">
            <div className="space-y-1">
                <Label htmlFor="administrative-fee-new-category" className="text-xs text-muted-foreground">手続き分類</Label>
                <select
                    id="administrative-fee-new-category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="flex h-10 w-full min-w-0 rounded-md border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                    {categories.map(category => <option key={category} value={category}>{category}</option>)}
                </select>
            </div>
            <div className="space-y-1">
                <Label htmlFor="administrative-fee-new-name" className="text-xs text-muted-foreground">手続き内容</Label>
                <Input
                    id="administrative-fee-new-name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    placeholder="例: 戸籍謄本の取得"
                    className="h-10 w-full text-sm"
                />
            </div>
            <div className="space-y-1">
                <Label htmlFor="administrative-fee-new-unit-price" className="text-xs text-muted-foreground">料金</Label>
                <CurrencyField
                    id="administrative-fee-new-unit-price"
                    value={newUnitPrice || undefined}
                    onValueChange={(value) => setNewUnitPrice(value || "")}
                    className="h-10 w-full text-right text-sm tabular-nums"
                />
            </div>
            <div className="space-y-1">
                <Label htmlFor="administrative-fee-new-note" className="text-xs text-muted-foreground">備考</Label>
                <Input
                    id="administrative-fee-new-note"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    placeholder="例: 1通あたり"
                    className="h-10 w-full text-sm"
                />
            </div>
        </div>
    )

    return (
        <>
            <MasterListPage<AdministrativeFeeItem>
                {...getMasterListPageProps(ml)}
                title="行政書士料金表"
                entityLabel="料金表の行"
                columns={COLUMNS}
                searchPlaceholder="手続き分類・手続き内容・備考・料金で検索"
                newItemForm={newItemForm}
                onAdd={handleAdd}
                renderEditCell={renderEditCell}
                onStartEdit={handleStartEdit}
                onSaveEdit={handleSaveEdit}
                groupBy={(item) => item.category || "（未分類）"}
                listToolbar={
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 rounded px-3 text-xs"
                            onClick={() => { void handleExport() }}
                        >
                            <Download className="mr-1 h-3 w-3" />Excel出力
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 rounded px-3 text-xs"
                            disabled={isImporting}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="mr-1 h-3 w-3" />{isImporting ? "取込中..." : "Excel取込"}
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            className="hidden"
                            aria-label="料金表の Excel ファイル"
                            onChange={(e) => { void handleImportFile(e) }}
                        />
                    </div>
                }
            />
            <div className="container mx-auto px-4 pb-10">
                <div className="space-y-1 rounded-md border bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
                    <p className="font-medium text-foreground">料金表の使い方</p>
                    <p>案件詳細の「行政書士」タブで、この表から手続きを選ぶと単価が入ります。案件側で単価を直しても、この表は変わりません。</p>
                    <p>Excel出力した表を直して取り込むと、手続き分類＋手続き内容が同じ行は料金・備考を上書きし、無い行は追加します（表に無い行はこの画面から消してください）。</p>
                    {ADMINISTRATIVE_FEE_NOTES.map(note => <p key={note}>※ {note}</p>)}
                </div>
            </div>
        </>
    )
}

export default function AdministrativeFeesPage() {
    return (
        <Suspense fallback={<div className="container mx-auto px-4 py-10"><p className="text-muted-foreground">読み込み中...</p></div>}>
            <AdministrativeFeesContent />
        </Suspense>
    )
}
