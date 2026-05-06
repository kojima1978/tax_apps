import type { Dispatch, SetStateAction } from "react"
import { Check, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { formatEmployeeId, type NewAssigneeDraft } from "./staff-utils"

interface AddAssigneeRowProps {
    deptId: number | null
    newAssignee: NewAssigneeDraft
    onNewAssigneeChange: Dispatch<SetStateAction<NewAssigneeDraft>>
    onAddAssignee: (deptId: number | null) => void
    onCancel: () => void
}

export function AddAssigneeRow({
    deptId,
    newAssignee,
    onNewAssigneeChange,
    onAddAssignee,
    onCancel,
}: AddAssigneeRowProps) {
    return (
        <div className="flex items-center gap-2 px-4 py-2 bg-muted/10 border-t">
            <Input
                value={newAssignee.employeeId}
                onChange={e => onNewAssigneeChange(prev => ({ ...prev, employeeId: e.target.value }))}
                onBlur={e => onNewAssigneeChange(prev => ({ ...prev, employeeId: formatEmployeeId(e.target.value) }))}
                placeholder="社員ID"
                className="h-8 text-sm w-20"
            />
            <Input
                value={newAssignee.name}
                onChange={e => onNewAssigneeChange(prev => ({ ...prev, name: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && onAddAssignee(deptId)}
                placeholder="氏名"
                className="h-8 text-sm flex-1"
                autoFocus
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 text-black/70" onClick={() => onAddAssignee(deptId)}>
                <Check className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
                <X className="h-3.5 w-3.5" />
            </Button>
        </div>
    )
}
