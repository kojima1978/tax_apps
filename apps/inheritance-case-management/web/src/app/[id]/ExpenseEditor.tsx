"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { CurrencyField } from "@/components/ui/CurrencyField"
import { EmptyState } from "@/components/ui/EmptyState"
import { Download, GripVertical, Receipt } from "lucide-react"
import type { Expense } from "@/types/shared"
import { formatCurrency } from "@/lib/analytics-utils"
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useSensors, useSensor, PointerSensor, KeyboardSensor } from "@dnd-kit/core"

function escapeCsvField(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}

function exportExpensesCsv(expenses: Expense[], total: number) {
    const BOM = "\uFEFF"
    const header = "日付,内容,金額,備考"
    const rows = expenses.map(e =>
        [e.date, escapeCsvField(e.description), String(e.amount), escapeCsvField(e.memo || "")].join(",")
    )
    rows.push(["", "合計", String(total), ""].join(","))
    const csv = BOM + [header, ...rows].join("\r\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `立替金_${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
}

const DESCRIPTION_OPTIONS = [
    "戸籍謄本",
    "登記簿謄本",
    "固定資産評価証明書",
    "残高証明書",
    "交通費",
] as const

const OTHER_VALUE = "__other__"

function today(): string {
    return new Date().toISOString().split("T")[0]
}

function isPresetValue(value: string): boolean {
    return (DESCRIPTION_OPTIONS as readonly string[]).includes(value)
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
                    className="h-11 px-2 text-muted-foreground hover:text-foreground whitespace-nowrap"
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
            className="flex h-11 w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
            <option value="" disabled>選択...</option>
            {DESCRIPTION_OPTIONS.map((opt) => (
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
            className="grid grid-cols-[auto_120px_140px_1fr_1fr_auto] gap-3 items-start p-3 border rounded-lg"
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
                    placeholder="備考"
                    value={expense.memo || ""}
                    onChange={(e) => onFieldChange(index, "memo", e.target.value)}
                />
            </div>
            <div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 h-11 px-2"
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
        <div className="space-y-4">
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
                    <Button type="button" variant="ghost" size="sm" onClick={() => exportExpensesCsv(expenses, total)}>
                        <Download className="h-4 w-4 mr-1" />
                        CSV出力
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
