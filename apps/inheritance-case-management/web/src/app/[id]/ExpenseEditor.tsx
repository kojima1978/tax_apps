"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { CurrencyField } from "@/components/ui/CurrencyField"
import { Copy, Download, GripVertical, Trash2 } from "lucide-react"
import type { CaseHeir, Expense } from "@/types/shared"
import { EXPENSE_DESCRIPTION_PRESETS } from "@/types/constants"
import { formatCurrency } from "@/lib/analytics-utils"
import { todayIsoDate } from "@/lib/date-utils"
import { exportFileName } from "@/lib/export-filename"
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useSensors, useSensor, PointerSensor, KeyboardSensor } from "@dnd-kit/core"
import { useToast } from "@/components/ui/Toast"

async function exportExpensesExcel(expenses: Expense[], total: number, deceasedName: string, heirs: CaseHeir[]) {
    const XLSX = await import("xlsx-js-style")
    const partyRows = [
        ["立替金明細"],
        ["被相続人", deceasedName, "様"],
        ...heirs
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map(heir => ["相続人", heir.person.name, "様"]),
        [],
    ]
    const rows = [
        ...partyRows,
        ["日付", "内容", "金額", "備考（購入場所など）"],
        ...expenses.map(e => [e.date, e.description, e.amount || 0, e.memo || ""]),
        ["", "合計", total, ""],
    ]
    const worksheet = XLSX.utils.aoa_to_sheet(rows)
    worksheet["!cols"] = [14, 14, 14, 28].map((minimumWidth, column) => {
        const contentWidth = rows.reduce((maximum, row) => {
            const value = row[column]
            const text = typeof value === "number"
                ? value.toLocaleString("ja-JP")
                : String(value ?? "")
            const width = Math.max(...text.split(/\r?\n/).map(line =>
                Array.from(line).reduce((sum, character) =>
                    sum + (/^[\u0020-\u007e\uff61-\uff9f]$/.test(character) ? 1 : 2), 0),
            ))
            return Math.max(maximum, width)
        }, 0)
        return { wch: Math.max(minimumWidth, contentWidth + 4) }
    })

    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:D1")
    const thinBorder = { style: "thin", color: { rgb: "000000" } }
    const expenseHeaderRow = partyRows.length
    for (let row = 1; row < partyRows.length - 1; row++) {
        const honorificCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 2 })]
        honorificCell.s = { alignment: { horizontal: "left" } }
    }
    for (let column = 0; column <= 3; column++) {
        const headerCell = worksheet[XLSX.utils.encode_cell({ r: expenseHeaderRow, c: column })]
        if (headerCell) {
            headerCell.s = { border: { bottom: thinBorder } }
        }
        const totalCell = worksheet[XLSX.utils.encode_cell({ r: range.e.r, c: column })]
        if (totalCell) {
            totalCell.s = { ...totalCell.s, border: { top: { style: "double", color: { rgb: "000000" } } } }
        }
    }
    for (let row = expenseHeaderRow + 1; row <= range.e.r; row++) {
        const amountCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 2 })]
        if (amountCell) {
            amountCell.z = "#,##0"
        }
    }

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "立替金")
    XLSX.writeFile(workbook, exportFileName([deceasedName, "立替金"], "xlsx"))
}

const OTHER_VALUE = "__other__"
const EXPENSE_ROW_LAYOUT = "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[24px_128px_minmax(160px,1.2fr)_176px_minmax(140px,1fr)_76px]"

function isPresetValue(value: string): boolean {
    return (EXPENSE_DESCRIPTION_PRESETS as readonly string[]).includes(value)
}

function DescriptionField({
    value,
    onChange,
}: {
    value: string
    onChange: (value: string) => void
}) {
    const isPreset = isPresetValue(value)
    const [freeInput, setFreeInput] = useState(!isPreset && value !== "")

    const showInput = freeInput || (!isPreset && value !== "")

    if (showInput) {
        return (
            <div className="flex gap-1">
                <Input
                    aria-label="立替金の内容"
                    placeholder="内容を入力"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    autoFocus={freeInput}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-10 px-2 text-xs text-muted-foreground hover:text-foreground whitespace-nowrap lg:h-9"
                    onClick={() => { setFreeInput(false); onChange("") }}
                >
                    一覧
                </Button>
            </div>
        )
    }

    return (
        <select
            aria-label="立替金の内容"
            value={isPreset ? value : ""}
            onChange={(e) => {
                const v = e.target.value
                if (v === OTHER_VALUE) {
                    setFreeInput(true)
                    onChange("")
                } else {
                    onChange(v)
                }
            }}
            className="flex h-10 w-full min-w-0 rounded-md border-2 border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:h-9"
        >
            <option value="" disabled>選択...</option>
            {EXPENSE_DESCRIPTION_PRESETS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
            ))}
            <option value={OTHER_VALUE}>その他（自由入力）</option>
        </select>
    )
}

function SortableExpenseRow({
    expense,
    index,
    onFieldChange,
    onDuplicate,
    onDelete,
}: {
    expense: Expense & { _id: string }
    index: number
    onFieldChange: <K extends keyof Expense>(index: number, field: K, value: Expense[K]) => void
    onDuplicate: (index: number) => void
    onDelete: (index: number) => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: expense._id })

    return (
        <div
            data-expense-row
            data-expense-index={index}
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
            className={`${EXPENSE_ROW_LAYOUT} items-start rounded-md border p-2`}
        >
            <button
                type="button"
                aria-label="ドラッグして順序変更"
                className="flex h-10 w-10 cursor-grab touch-none items-center justify-center text-muted-foreground hover:text-foreground active:cursor-grabbing sm:col-span-2 lg:col-span-1 lg:h-9 lg:w-6"
                {...attributes}
                {...listeners}
            >
                <GripVertical className="h-4 w-4" />
            </button>
            <div className="min-w-0">
                <span className="mb-1 block text-xs text-muted-foreground lg:hidden">日付</span>
                <Input
                    aria-label="立替日"
                    type="date"
                    value={expense.date}
                    onChange={(e) => onFieldChange(index, "date", e.target.value)}
                />
            </div>
            <div className="min-w-0">
                <span className="mb-1 block text-xs text-muted-foreground lg:hidden">内容</span>
                <DescriptionField
                    value={expense.description}
                    onChange={(value) => onFieldChange(index, "description", value)}
                />
            </div>
            <div className="min-w-0">
                <span className="mb-1 block text-xs text-muted-foreground lg:hidden">金額</span>
                <CurrencyField
                    aria-label="立替金額"
                    placeholder="金額"
                    className="text-right tabular-nums"
                    value={expense.amount || undefined}
                    onValueChange={(value) => onFieldChange(index, "amount", value ? Number(value) : 0)}
                />
            </div>
            <div className="min-w-0">
                <span className="mb-1 block text-xs text-muted-foreground lg:hidden">備考（購入場所など）</span>
                <Input
                    aria-label="立替金メモ"
                    placeholder="備考（購入場所など）"
                    value={expense.memo || ""}
                    onChange={(e) => onFieldChange(index, "memo", e.target.value)}
                />
            </div>
            <div className="flex gap-1 sm:col-span-2 lg:col-span-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`${index + 1}行目の立替金を複製`}
                    title="この行を末尾に複製"
                    className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground lg:h-9 lg:w-9"
                    onClick={() => onDuplicate(index)}
                >
                    <Copy className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="この立替金を削除"
                    title="削除"
                    className="h-10 w-10 p-0 text-muted-foreground hover:text-foreground lg:h-9 lg:w-9"
                    onClick={() => onDelete(index)}
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </Button>
            </div>
        </div>
    )
}

interface ExpenseEditorProps {
    expenses: Expense[]
    deceasedName: string
    heirs: CaseHeir[]
    hasUnsavedChanges: boolean
    onChange: (expenses: Expense[]) => void
}

export function ExpenseEditor({ expenses, deceasedName, heirs, hasUnsavedChanges, onChange }: ExpenseEditorProps) {
    const toast = useToast()
    const [isExporting, setIsExporting] = useState(false)
    const editorRef = useRef<HTMLDivElement>(null)
    const pendingFocusIndex = useRef<number | null>(null)

    useEffect(() => {
        if (pendingFocusIndex.current === null) return
        editorRef.current?.querySelector<HTMLInputElement>(
            `[data-expense-index="${pendingFocusIndex.current}"] input[type="date"]`,
        )?.focus()
        pendingFocusIndex.current = null
    }, [expenses.length])

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor),
    )

    const itemsWithIds = useMemo(
        () => expenses.map((e, i) => ({ ...e, _id: `expense-${i}` })),
        [expenses],
    )
    const itemIds = useMemo(() => itemsWithIds.map(e => e._id), [itemsWithIds])

    const handleAdd = () => {
        pendingFocusIndex.current = expenses.length
        onChange([...expenses, { date: todayIsoDate(), description: "", amount: 0 }])
    }

    const handleDuplicate = (index: number) => {
        pendingFocusIndex.current = expenses.length
        onChange([...expenses, { ...expenses[index] }])
    }

    const handleDelete = (index: number) => {
        if (!confirm("この立替金を削除してもよろしいですか？")) return
        onChange(expenses.filter((_, i) => i !== index))
    }

    const handleFieldChange = <K extends keyof Expense>(index: number, field: K, value: Expense[K]) => {
        const updated = [...expenses]
        updated[index] = { ...updated[index], [field]: value }
        onChange(updated)
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        const oldIndex = itemIds.indexOf(active.id as string)
        const newIndex = itemIds.indexOf(over.id as string)
        onChange(arrayMove(expenses, oldIndex, newIndex))
    }

    const total = expenses.reduce((sum, e) => sum + (e.amount || 0), 0)

    return (
        <div ref={editorRef} className="space-y-2 [&_input]:!h-10 lg:[&_input]:!h-9">
            <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">日付・内容・金額・備考を入力</span>
                <Button type="button" variant="outline" size="sm" className="h-10 shrink-0 px-2.5 text-xs lg:h-9" onClick={handleAdd}>
                    + 追加
                </Button>
            </div>

            {expenses.length > 0 && (
                <div className={`${EXPENSE_ROW_LAYOUT} hidden px-2 text-xs text-muted-foreground lg:grid`}>
                    <span className="w-6" /><span>日付</span><span>内容</span><span className="text-right">金額</span><span>備考（購入場所など）</span><span className="w-[76px]">操作</span>
                </div>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                    {itemsWithIds.map((expense, index) => (
                        <SortableExpenseRow
                            key={expense._id}
                            expense={expense}
                            index={index}
                            onFieldChange={handleFieldChange}
                            onDuplicate={handleDuplicate}
                            onDelete={handleDelete}
                        />
                    ))}
                </SortableContext>
            </DndContext>

            {expenses.length === 0 && (
                <div className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
                    立替金は登録されていません
                </div>
            )}

            {expenses.length > 0 && (
                <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" className="h-10 px-2.5 text-xs lg:h-9" onClick={handleAdd}>
                        + 末尾に追加
                    </Button>
                </div>
            )}

            {expenses.length > 0 && (
                <>
                    {hasUnsavedChanges && (
                        <p role="status" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
                            未保存の変更があります。Excelには現在の入力内容を出力します。案件に反映するには、画面下で保存してください。
                        </p>
                    )}
                    <div className="flex items-center justify-between border-t pt-1.5">
                        <Button type="button" variant="ghost" size="sm" className="h-10 px-2 text-xs lg:h-9" disabled={isExporting} onClick={async () => {
                            setIsExporting(true)
                            try { await exportExpensesExcel(expenses, total, deceasedName, heirs) }
                            catch { toast.error("Excel出力に失敗しました。再度お試しください。") }
                            finally { setIsExporting(false) }
                        }}>
                            <Download className="mr-1 h-3.5 w-3.5" />
                            {isExporting ? "出力中…" : "Excel出力"}
                        </Button>
                        <div className="flex items-baseline gap-2">
                            <span className="text-[11px] font-medium text-muted-foreground">合計</span>
                            <span className="text-sm font-bold">{formatCurrency(total)}</span>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
