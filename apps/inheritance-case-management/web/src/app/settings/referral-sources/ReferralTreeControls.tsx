import { Check, Pencil, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import type { ReferralTreeNode } from "./referral-source-utils"

export function EditableName({
    value,
    onChange,
    onSave,
    onCancel,
}: {
    value: string
    onChange: (value: string) => void
    onSave: () => void
    onCancel: () => void
}) {
    return (
        <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
            <Input
                value={value}
                onChange={e => onChange(e.target.value)}
                onKeyDown={e => {
                    if (e.key === "Enter") onSave()
                    if (e.key === "Escape") onCancel()
                }}
                className="h-7 text-sm flex-1"
                autoFocus
            />
            <Button variant="ghost" size="icon" className="h-6 w-6 text-black/70" onClick={onSave}>
                <Check className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancel}>
                <X className="h-3 w-3" />
            </Button>
        </div>
    )
}

export function NodeActions({
    node,
    onStartEdit,
    onDelete,
}: {
    node: ReferralTreeNode
    onStartEdit: (node: ReferralTreeNode) => void
    onDelete: (node: ReferralTreeNode) => void
}) {
    return (
        <div className="hidden group-hover:flex items-center gap-0.5">
            <button className="p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); onStartEdit(node) }}>
                <Pencil className="h-3 w-3 text-muted-foreground" />
            </button>
            <button className="p-1 rounded hover:bg-destructive/10" onClick={e => { e.stopPropagation(); onDelete(node) }}>
                <Trash2 className="h-3 w-3 text-destructive" />
            </button>
        </div>
    )
}
