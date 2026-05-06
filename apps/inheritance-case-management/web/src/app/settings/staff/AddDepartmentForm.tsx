import { Building2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"

interface AddDepartmentFormProps {
    name: string
    onNameChange: (value: string) => void
    onSave: () => void
    onCancel: () => void
}

export function AddDepartmentForm({ name, onNameChange, onSave, onCancel }: AddDepartmentFormProps) {
    return (
        <div className="flex items-center gap-2 mb-4 p-3 border rounded-lg bg-card">
            <Building2 className="h-4 w-4 text-black/70 shrink-0" />
            <Input
                value={name}
                onChange={e => onNameChange(e.target.value)}
                onKeyDown={e => e.key === "Enter" && onSave()}
                placeholder="新しい部署名"
                className="h-9 text-sm max-w-xs"
                autoFocus
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-black/70" onClick={onSave}>
                <Check className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onCancel}>
                <X className="h-4 w-4" />
            </Button>
        </div>
    )
}
