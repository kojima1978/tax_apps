"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ExternalLink, GripVertical, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { CurrencyField } from "@/components/ui/CurrencyField"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import { formatCurrency } from "@/lib/analytics-utils"
import { getAdministrativeFeeItems } from "@/lib/api/administrative-fee-items"
import { ADMINISTRATIVE_FEE_CATEGORIES, ADMINISTRATIVE_FEE_NOTES } from "@/lib/constants/administrative-fees"
import type { AdministrativeFee, AdministrativeFeeItem } from "@/types/shared"
import {
    administrativeFeeRowTotal,
    administrativeFeeTotal,
    emptyAdministrativeFeeRow,
    feeItemToRow,
    groupFeeItemsByCategory,
} from "./administrative-fee-utils"
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export const ADMINISTRATIVE_FEE_ITEMS_QUERY_KEY = ["administrative-fee-items"] as const

const ROW_LAYOUT = "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[24px_140px_minmax(200px,1.6fr)_64px_124px_96px_minmax(96px,0.8fr)_44px]"

function SortableFeeRow({
    fee,
    index,
    categories,
    onFieldChange,
    onDelete,
}: {
    fee: AdministrativeFee & { _id: string }
    index: number
    categories: string[]
    onFieldChange: <K extends keyof AdministrativeFee>(index: number, field: K, value: AdministrativeFee[K]) => void
    onDelete: (index: number) => void
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: fee._id })

    return (
        <div
            data-administrative-fee-index={index}
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
            className={`${ROW_LAYOUT} items-start rounded-md border p-2`}
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
                <span className="mb-1 block text-xs text-muted-foreground lg:hidden">手続き分類</span>
                <select
                    aria-label={`${index + 1}行目の手続き分類`}
                    value={fee.category}
                    onChange={(e) => onFieldChange(index, "category", e.target.value)}
                    className="flex h-10 w-full min-w-0 rounded-md border-2 border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:h-9"
                >
                    <option value="">（未分類）</option>
                    {categories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                    ))}
                </select>
            </div>
            <div className="min-w-0">
                <span className="mb-1 block text-xs text-muted-foreground lg:hidden">手続き内容</span>
                <Input
                    aria-label={`${index + 1}行目の手続き内容`}
                    placeholder="手続き内容"
                    value={fee.name}
                    onChange={(e) => onFieldChange(index, "name", e.target.value)}
                />
            </div>
            <div className="min-w-0">
                <span className="mb-1 block text-xs text-muted-foreground lg:hidden">件数</span>
                <Input
                    aria-label={`${index + 1}行目の件数`}
                    type="number"
                    min={0}
                    max={999}
                    className="text-right tabular-nums"
                    value={fee.quantity}
                    onChange={(e) => onFieldChange(index, "quantity", Math.max(0, Math.min(999, Number(e.target.value) || 0)))}
                />
            </div>
            <div className="min-w-0">
                <span className="mb-1 block text-xs text-muted-foreground lg:hidden">単価</span>
                <CurrencyField
                    aria-label={`${index + 1}行目の単価`}
                    placeholder="単価"
                    className="text-right tabular-nums"
                    value={fee.unitPrice || undefined}
                    onValueChange={(value) => onFieldChange(index, "unitPrice", value ? Number(value) : 0)}
                />
            </div>
            <div className="min-w-0">
                <span className="mb-1 block text-xs text-muted-foreground lg:hidden">小計</span>
                <div className="flex h-10 items-center justify-end px-1 text-sm font-medium tabular-nums lg:h-9">
                    {formatCurrency(administrativeFeeRowTotal(fee))}
                </div>
            </div>
            <div className="min-w-0">
                <span className="mb-1 block text-xs text-muted-foreground lg:hidden">備考</span>
                <Input
                    aria-label={`${index + 1}行目の備考`}
                    placeholder="備考"
                    value={fee.memo || ""}
                    onChange={(e) => onFieldChange(index, "memo", e.target.value)}
                />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`${index + 1}行目の遺産整理業務を削除`}
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

function FeeItemPicker({
    isOpen,
    items,
    onClose,
    onAdd,
}: {
    isOpen: boolean
    items: AdministrativeFeeItem[]
    onClose: () => void
    onAdd: (selected: AdministrativeFeeItem[]) => void
}) {
    const [selectedIds, setSelectedIds] = useState<number[]>([])
    const groups = useMemo(() => groupFeeItemsByCategory(items), [items])

    const close = () => {
        setSelectedIds([])
        onClose()
    }

    const toggle = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
    }

    const add = () => {
        onAdd(items.filter(item => selectedIds.includes(item.id)))
        close()
    }

    return (
        <Modal isOpen={isOpen} onClose={close} title="料金表から追加" panelClassName="max-w-3xl">
            <div className="space-y-3">
                {groups.length === 0 && (
                    <p className="rounded-md border border-dashed py-6 text-center text-xs text-muted-foreground">
                        料金表に行がありません。設定の「遺産整理料金表」で登録してください。
                    </p>
                )}
                {groups.map((group) => (
                    <section key={group.category} className="rounded-md border">
                        <div className="border-b bg-muted/30 px-2.5 py-1.5 text-xs font-semibold">{group.category}</div>
                        <ul className="divide-y">
                            {group.items.map((item) => (
                                <li key={item.id}>
                                    <label className="flex cursor-pointer items-start gap-2 px-2.5 py-1.5 hover:bg-muted/40">
                                        <input
                                            type="checkbox"
                                            className="mt-1 h-4 w-4 shrink-0"
                                            checked={selectedIds.includes(item.id)}
                                            onChange={() => toggle(item.id)}
                                        />
                                        <span className="min-w-0 flex-1 text-xs leading-relaxed">
                                            {item.name}
                                            {item.note && <span className="ml-1 text-[11px] text-muted-foreground">（{item.note}）</span>}
                                        </span>
                                        <span className="shrink-0 text-xs font-medium tabular-nums">{formatCurrency(item.unitPrice)}</span>
                                    </label>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}
                <div className="flex items-center justify-between gap-2 border-t pt-2">
                    <span className="text-xs text-muted-foreground">{selectedIds.length}件を選択中</span>
                    <div className="flex gap-2">
                        <Button type="button" variant="ghost" size="sm" className="h-9" onClick={close}>キャンセル</Button>
                        <Button type="button" size="sm" className="h-9" disabled={selectedIds.length === 0} onClick={add}>
                            選んだ手続きを追加
                        </Button>
                    </div>
                </div>
            </div>
        </Modal>
    )
}

interface AdministrativeFeeEditorProps {
    fees: AdministrativeFee[]
    onChange: (fees: AdministrativeFee[]) => void
}

/**
 * 遺産整理業務の報酬の明細。単価は料金表から**写す**ので、
 * 料金表を後で変えても登録済みの案件の金額は動かない（この画面で直せる）。
 */
export function AdministrativeFeeEditor({ fees, onChange }: AdministrativeFeeEditorProps) {
    const [isPickerOpen, setIsPickerOpen] = useState(false)
    const { data: feeItems = [], isLoading } = useQuery({
        queryKey: ADMINISTRATIVE_FEE_ITEMS_QUERY_KEY,
        queryFn: getAdministrativeFeeItems,
        staleTime: 5 * 60 * 1000,
    })

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor),
    )

    const itemsWithIds = useMemo(() => fees.map((f, i) => ({ ...f, _id: `administrative-fee-${i}` })), [fees])
    const itemIds = useMemo(() => itemsWithIds.map(f => f._id), [itemsWithIds])

    // 料金表に無い分類も選べるように、今の明細の分類も選択肢へ入れる
    const categories = useMemo(() => {
        const fromItems = feeItems.map(item => item.category)
        const fromRows = fees.map(fee => fee.category)
        return [...new Set([...ADMINISTRATIVE_FEE_CATEGORIES, ...fromItems, ...fromRows])].filter(Boolean)
    }, [feeItems, fees])

    const handleFieldChange = <K extends keyof AdministrativeFee>(index: number, field: K, value: AdministrativeFee[K]) => {
        const updated = [...fees]
        updated[index] = { ...updated[index], [field]: value }
        onChange(updated)
    }

    const handleDelete = (index: number) => {
        onChange(fees.filter((_, i) => i !== index))
    }

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (!over || active.id === over.id) return
        onChange(arrayMove(fees, itemIds.indexOf(active.id as string), itemIds.indexOf(over.id as string)))
    }

    const total = administrativeFeeTotal(fees)

    return (
        <div className="space-y-2 [&_input]:!h-10 lg:[&_input]:!h-9">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">料金表から選ぶと単価が入ります。件数・単価はこの画面で直せます</span>
                <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="outline" size="sm" className="h-10 px-2.5 text-xs lg:h-9" onClick={() => setIsPickerOpen(true)} disabled={isLoading}>
                        <Plus className="mr-1 h-3.5 w-3.5" />料金表から追加
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-10 px-2.5 text-xs lg:h-9" onClick={() => onChange([...fees, emptyAdministrativeFeeRow()])}>
                        + 自由入力の行
                    </Button>
                </div>
            </div>

            {fees.length > 0 && (
                <div className={`${ROW_LAYOUT} hidden px-2 text-xs text-muted-foreground lg:grid`}>
                    <span className="w-6" /><span>手続き分類</span><span>手続き内容</span><span className="text-right">件数</span><span className="text-right">単価</span><span className="text-right">小計</span><span>備考</span><span className="w-[44px]">操作</span>
                </div>
            )}

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                        {itemsWithIds.map((fee, index) => (
                            <SortableFeeRow
                                key={fee._id}
                                fee={fee}
                                index={index}
                                categories={categories}
                                onFieldChange={handleFieldChange}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {fees.length === 0 && (
                <div className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
                    遺産整理業務は登録されていません
                </div>
            )}

            {fees.length > 0 && (
                <div className="flex items-center justify-between border-t pt-1.5">
                    <span className="text-[11px] text-muted-foreground">{fees.length}件</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-[11px] font-medium text-muted-foreground">合計</span>
                        <span className="text-sm font-bold tabular-nums">{formatCurrency(total)}</span>
                    </div>
                </div>
            )}

            <div className="space-y-1 border-t pt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                {ADMINISTRATIVE_FEE_NOTES.map((note) => (
                    <p key={note}>※ {note}</p>
                ))}
                <p>
                    <Link href="/settings/administrative-fees" className="inline-flex items-center gap-1 underline hover:text-foreground">
                        料金表を編集する<ExternalLink className="h-3 w-3" />
                    </Link>
                </p>
            </div>

            <FeeItemPicker
                isOpen={isPickerOpen}
                items={feeItems}
                onClose={() => setIsPickerOpen(false)}
                onAdd={(selected) => onChange([...fees, ...selected.map(feeItemToRow)])}
            />
        </div>
    )
}
