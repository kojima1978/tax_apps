import Link from "next/link"
import { Label } from "./Label"
import { SelectField } from "./SelectField"

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
}

export function MasterSelect<T extends { id: number; active: boolean }>({
    id, label, value, items, placeholder, editHref, editLabel, renderOption, onChange,
}: MasterSelectProps<T>) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id}>{label}</Label>
            <SelectField id={id} name={id} value={value || ""} onChange={onChange}>
                <option value="">{placeholder}</option>
                {items.filter(item => item.active !== false).map((item) => {
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
