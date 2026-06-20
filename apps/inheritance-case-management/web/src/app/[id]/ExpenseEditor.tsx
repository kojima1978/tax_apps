"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { CurrencyField } from "@/components/ui/CurrencyField"
import { Download, GripVertical, Trash2 } from "lucide-react"
import type { Expense } from "@/types/shared"
import { EXPENSE_DESCRIPTION_PRESETS } from "@/types/constants"
import { formatCurrency } from "@/lib/analytics-utils"
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useSensors, useSensor, PointerSensor, KeyboardSensor } from "@dnd-kit/core"
import * as XLSX from "xlsx-js-style"

function exportExpensesExcel(expenses: Expense[], total: number) {
    const rows = [
        ["日付", "内容", "金額", "備考（購入場所など）"],
        ...expenses.map(e => [e.date, e.description, e.amount || 0, e.memo || ""]),
        ["", "合計", total, ""],
    ]
    const worksheet = XLSX.utils.aoa_to_sheet(rows)
    worksheet["!cols"] = [
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 28 },
    ]

    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:D1")
    const thinBorder = { style: "thin", color: { rgb: "000000" } }
    for (let column = 0; column <= 3; column++) {
        const headerCell = worksheet[XLSX.utils.encode_cell({ r: 0, c: column })]
        if (headerCell) {
            headerCell.s = { border: { bottom: thinBorder } }
        }
        const totalCell = worksheet[XLSX.utils.encode_cell({ r: range.e.r, c: column })]
        if (totalCell) {
            totalCell.s = { ...totalCell.s, border: { top: thinBorder } }
        }
    }
    for (let row = 1; row <= range.e.r; row++) {
        const amountCell = worksheet[XLSX.utils.encode_cell({ r: row, c: 2 })]
        if (amountCell) {
            amountCell.z = "#,##0"
        }
    }

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "立替金")
    XLSX.writeFile(workbook, `立替金_${new Date().toISOString().split("T")[0]}.xlsx`)
}

const OTHER_VALUE = "__other__"

function today(): string {
    return new Date().toISOString().split("T")[0]
}

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
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground whitespace-nowrap"
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
            className="flex h-8 w-full rounded-md border-2 border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
    onDelete,
}: {
    expense: Expense & { _id: string }
    index: number
    onFieldChange: <K extends keyof Expense>(index: number, field: K, value: Expense[K]) => void
    onDelete: (index: number) => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: expense._id })

    return (
        <div
            data-expense-row
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
            className="grid grid-cols-1 items-start gap-1.5 rounded-md border p-2 sm:grid-cols-[auto_112px_105px_minmax(125px,1fr)_minmax(110px,0.8fr)_auto]"
        >
            <button
                type="button"
                aria-label="ドラッグして順序変更"
                className="mt-2 cursor-grab touch-none text-muted-foreground/40 hover:text-muted-foreground active:cursor-grabbing"
                {...attributes}
                {...listeners}
            >
                <GripVertical className="h-4 w-4" />
            </button>
            <div>
                <Input
                    aria-label="立替日"
                    type="date"
                    value={expense.date}
                    onChange={(e) => onFieldChange(index, "date", e.target.value)}
                />
            </div>
            <div>
                <CurrencyField
                    aria-label="立替金額"
                    placeholder="金額"
                    value={expense.amount || undefined}
                    onValueChange={(value) => onFieldChange(index, "amount", value ? Number(value) : 0)}
                />
            </div>
            <div>
                <DescriptionField
                    value={expense.description}
                    onChange={(value) => onFieldChange(index, "description", value)}
                />
            </div>
            <div>
                <Input
                    aria-label="立替金メモ"
                    placeholder="備考（購入場所など）"
                    value={expense.memo || ""}
                    onChange={(e) => onFieldChange(index, "memo", e.target.value)}
                />
            </div>
            <div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="この立替金を削除"
                    title="削除"
                    className="h-8 w-8 p-0 text-gray-500 hover:text-gray-800"
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
    onChange: (expenses: Expense[]) => void
}

export function ExpenseEditor({ expenses, onChange }: ExpenseEditorProps) {
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
        onChange([...expenses, { date: today(), description: "", amount: 0 }])
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
        <div className="space-y-2 [&_input]:!h-8">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">日付・金額・内容・メモを入力</span>
                <Button type="button" variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={handleAdd}>
                    + 追加
                </Button>
            </div>

            {expenses.length > 0 && (
                <div className="hidden grid-cols-[auto_112px_105px_minmax(125px,1fr)_minmax(110px,0.8fr)_auto] gap-1.5 px-2 text-[10px] text-muted-foreground sm:grid">
                    <span className="w-4" /><span>日付</span><span>金額</span><span>内容</span><span>メモ</span><span className="w-8" />
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
                <div className="flex items-center justify-between border-t pt-1.5">
                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => exportExpensesExcel(expenses, total)}>
                        <Download className="mr-1 h-3.5 w-3.5" />
                        Excel出力
                    </Button>
                    <div className="flex items-baseline gap-2">
                        <span className="text-[11px] font-medium text-muted-foreground">合計</span>
                        <span className="text-sm font-bold">{formatCurrency(total)}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
