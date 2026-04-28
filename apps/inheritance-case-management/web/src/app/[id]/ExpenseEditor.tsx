"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { CurrencyField } from "@/components/ui/CurrencyField"
import { EmptyState } from "@/components/ui/EmptyState"
import { Download, GripVertical, Receipt } from "lucide-react"
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
            <div className="flex gap-2">
                <Input
                    placeholder="内容を入力"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    autoFocus={freeInput}
                />
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-10 px-2 text-muted-foreground hover:text-foreground whitespace-nowrap"
                    onClick={() => { setFreeInput(false); onChange("") }}
                >
                    一覧
                </Button>
            </div>
        )
    }

    return (
        <select
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
            className="flex h-11 w-full rounded-lg border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:h-10"
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
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
            className="grid grid-cols-1 gap-2 items-start rounded-lg border p-3 lg:grid-cols-[auto_120px_130px_minmax(180px,1fr)_minmax(160px,1fr)_auto] lg:gap-3"
        >
            <button
                type="button"
                aria-label="ドラッグして順序変更"
                className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none mt-2.5"
                {...attributes}
                {...listeners}
            >
                <GripVertical className="h-4 w-4" />
            </button>
            <div>
                <Input
                    type="date"
                    value={expense.date}
                    onChange={(e) => onFieldChange(index, "date", e.target.value)}
                />
            </div>
            <div>
                <CurrencyField
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
                    className="h-10 px-2 text-gray-500 hover:text-gray-800"
                    onClick={() => onDelete(index)}
                >
                    削除
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
        <div className="space-y-3">
            <div className="flex items-center justify-end">
                <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
                    + 追加
                </Button>
            </div>

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
                <EmptyState
                    icon={Receipt}
                    title="立替金が登録されていません"
                    description="「+ 追加」ボタンで立替金を追加できます"
                    action={{ label: "+ 追加", onClick: handleAdd }}
                />
            )}

            {expenses.length > 0 && (
                <div className="flex justify-between items-center pt-2 border-t">
                    <Button type="button" variant="ghost" size="sm" onClick={() => exportExpensesExcel(expenses, total)}>
                        <Download className="h-4 w-4 mr-1" />
                        Excel出力
                    </Button>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">合計</span>
                        <span className="text-lg font-bold">{formatCurrency(total)}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
