import { useMemo } from "react"
import Link from "next/link"
import { Label } from "./Label"
import { SelectField } from "./SelectField"

interface GroupConfig<T> {
    key: (item: T) => string
    sortOrder: (item: T) => number
}

interface MasterSelectProps<T extends { id: number; active: boolean }> {
    id: string
    label: string
    value: string | number | null | undefined
    items: T[]
    placeholder: string
    editHref: string
    editLabel: string
    renderOption: (item: T) => { value: string | number; label: string }
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
    groupBy?: GroupConfig<T>
}

export function MasterSelect<T extends { id: number; active: boolean }>({
    id, label, value, items, placeholder, editHref, editLabel, renderOption, onChange, groupBy,
}: MasterSelectProps<T>) {
    const activeItems = useMemo(() => items.filter(item => item.active !== false), [items])

    const grouped = useMemo(() => {
        if (!groupBy) return null
        const map = new Map<string, { sortOrder: number; members: T[] }>()
        for (const item of activeItems) {
            const group = groupBy.key(item)
            const order = groupBy.sortOrder(item)
            if (!map.has(group)) map.set(group, { sortOrder: order, members: [] })
            map.get(group)!.members.push(item)
        }
        return [...map.entries()]
            .sort(([, a], [, b]) => a.sortOrder - b.sortOrder)
    }, [activeItems, groupBy])

    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <SelectField id={id} name={id} value={value || ""} onChange={onChange}>
                <option value="">{placeholder}</option>
                {grouped ? grouped.map(([group, { members }]) => (
                    <optgroup key={group} label={group}>
                        {members.map((item) => {
                            const opt = renderOption(item)
                            return <option key={item.id} value={opt.value}>{opt.label}</option>
                        })}
                    </optgroup>
                )) : activeItems.map((item) => {
                    const opt = renderOption(item)
                    return <option key={item.id} value={opt.value}>{opt.label}</option>
                })}
            </SelectField>
            <div className="text-right text-xs">
                <Link href={editHref} className="text-muted-foreground hover:underline hover:text-primary">
                    {editLabel}
                </Link>
            </div>
        </div>
    )
}
