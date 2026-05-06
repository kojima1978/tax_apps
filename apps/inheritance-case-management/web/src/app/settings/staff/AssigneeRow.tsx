import type { Dispatch, SetStateAction } from "react"
import { Ban, Check, Pencil, RotateCcw, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { SelectField } from "@/components/ui/SelectField"
import type { Assignee, Department } from "@/types/shared"
import { formatEmployeeId, type EditingAssignee } from "./staff-utils"

interface AssigneeRowProps {
    assignee: Assignee
    activeDepts: Department[]
    editingAssignee: EditingAssignee | null
    onEditingAssigneeChange: Dispatch<SetStateAction<EditingAssignee | null>>
    onStartEditAssignee: (assignee: Assignee) => void
    onSaveAssigneeEdit: () => void
    onToggleAssigneeActive: (assignee: Assignee) => void
    onDeleteAssignee: (assignee: Assignee) => void
}

export function AssigneeRow({
    assignee,
    activeDepts,
    editingAssignee,
    onEditingAssigneeChange,
    onStartEditAssignee,
    onSaveAssigneeEdit,
    onToggleAssigneeActive,
    onDeleteAssignee,
}: AssigneeRowProps) {
    return (
        <div className={`group flex items-center gap-3 px-4 py-2 ${assignee.active === false ? "bg-muted/50 opacity-60" : "hover:bg-muted/20"}`}>
            {editingAssignee?.id === assignee.id ? (
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <Input
                        value={editingAssignee.employeeId}
                        onChange={e => onEditingAssigneeChange(prev => prev && { ...prev, employeeId: e.target.value })}
                        onBlur={e => onEditingAssigneeChange(prev => prev && { ...prev, employeeId: formatEmployeeId(e.target.value) })}
                        placeholder="社員ID"
                        className="h-8 text-sm w-20"
                    />
                    <SelectField
                        value={editingAssignee.departmentId}
                        onChange={e => onEditingAssigneeChange(prev => prev && { ...prev, departmentId: e.target.value })}
                        className="h-8 text-sm w-36"
                    >
                        <option value="">部署なし</option>
                        {activeDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </SelectField>
                    <Input
                        value={editingAssignee.name}
                        onChange={e => onEditingAssigneeChange(prev => prev && { ...prev, name: e.target.value })}
                        onKeyDown={e => { if (e.key === "Enter") onSaveAssigneeEdit(); if (e.key === "Escape") onEditingAssigneeChange(null) }}
                        placeholder="氏名"
                        className="h-8 text-sm flex-1 min-w-[100px]"
                        autoFocus
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-black/70" onClick={onSaveAssigneeEdit}>
                        <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditingAssigneeChange(null)}>
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
            ) : (
                <>
                    <span className="text-xs text-muted-foreground w-12 shrink-0 font-mono">{assignee.employeeId || "-"}</span>
                    <span className="text-sm flex-1 font-medium">{assignee.name}</span>
                    <div className="hidden group-hover:flex items-center gap-0.5">
                        <button className="p-1 rounded hover:bg-muted" onClick={() => onStartEditAssignee(assignee)}>
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        {assignee.active === false ? (
                            <>
                                <button className="p-1 rounded hover:bg-gray-100" onClick={() => onToggleAssigneeActive(assignee)} title="有効化">
                                    <RotateCcw className="h-3.5 w-3.5 text-black/70" />
                                </button>
                                <button className="p-1 rounded hover:bg-destructive/10" onClick={() => onDeleteAssignee(assignee)} title="完全削除">
                                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </button>
                            </>
                        ) : (
                            <button className="p-1 rounded hover:bg-gray-100" onClick={() => onToggleAssigneeActive(assignee)} title="無効化">
                                <Ban className="h-3.5 w-3.5 text-black/70" />
                            </button>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
