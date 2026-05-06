import type { Dispatch, SetStateAction } from "react"
import { Building2, Check, ChevronDown, Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import type { Assignee, Department } from "@/types/shared"
import { AddAssigneeRow } from "./AddAssigneeRow"
import { AssigneeRow } from "./AssigneeRow"
import type { EditingAssignee, NewAssigneeDraft, StaffGroup } from "./staff-utils"

interface StaffGroupListProps {
    groups: StaffGroup[]
    activeDepts: Department[]
    expandedDepts: Set<string>
    editingDeptId: number | null
    editDeptName: string
    addingAssigneeForDept: number | "none" | null
    newAssignee: NewAssigneeDraft
    editingAssignee: EditingAssignee | null
    onToggleDeptExpanded: (key: string) => void
    onEditDeptNameChange: (value: string) => void
    onStartEditDept: (dept: Department) => void
    onCancelEditDept: () => void
    onSaveDeptEdit: () => void
    onDeleteDept: (dept: Department) => void
    onSetAddingAssigneeForDept: (value: number | "none" | null) => void
    onSetAddingDept: (value: boolean) => void
    onNewAssigneeChange: Dispatch<SetStateAction<NewAssigneeDraft>>
    onAddAssignee: (deptId: number | null) => void
    onEditingAssigneeChange: Dispatch<SetStateAction<EditingAssignee | null>>
    onStartEditAssignee: (assignee: Assignee) => void
    onSaveAssigneeEdit: () => void
    onToggleAssigneeActive: (assignee: Assignee) => void
    onDeleteAssignee: (assignee: Assignee) => void
}

export function StaffGroupList({
    groups,
    activeDepts,
    expandedDepts,
    editingDeptId,
    editDeptName,
    addingAssigneeForDept,
    newAssignee,
    editingAssignee,
    onToggleDeptExpanded,
    onEditDeptNameChange,
    onStartEditDept,
    onCancelEditDept,
    onSaveDeptEdit,
    onDeleteDept,
    onSetAddingAssigneeForDept,
    onSetAddingDept,
    onNewAssigneeChange,
    onAddAssignee,
    onEditingAssigneeChange,
    onStartEditAssignee,
    onSaveAssigneeEdit,
    onToggleAssigneeActive,
    onDeleteAssignee,
}: StaffGroupListProps) {
    if (groups.length === 0) {
        return <p className="text-sm text-muted-foreground text-center py-8">該当する担当者がいません</p>
    }

    return (
        <div className="space-y-4">
            {groups.map(({ dept, members }) => {
                const deptKey = dept ? `dept-${dept.id}` : "no-dept"
                const isEditingDept = editingDeptId !== null && dept?.id === editingDeptId
                const addKey = dept ? dept.id : "none"
                const expandKey = dept ? String(dept.id) : "none"
                const isExpanded = expandedDepts.has(expandKey)

                return (
                    <div key={deptKey} className="border rounded-lg bg-card overflow-hidden">
                        <div className={`group flex items-center gap-2 px-4 py-2.5 bg-muted/40 ${isExpanded ? "border-b" : ""}`}>
                            <button
                                className="flex items-center gap-2 flex-1 min-w-0"
                                onClick={() => onToggleDeptExpanded(expandKey)}
                            >
                                <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? "" : "-rotate-90"}`} />
                                <Building2 className="h-4 w-4 text-black/70 shrink-0" />
                                {isEditingDept ? (
                                    <div className="flex items-center gap-1 flex-1" onClick={e => e.stopPropagation()}>
                                        <Input
                                            value={editDeptName}
                                            onChange={e => onEditDeptNameChange(e.target.value)}
                                            onKeyDown={e => { if (e.key === "Enter") onSaveDeptEdit(); if (e.key === "Escape") onCancelEditDept() }}
                                            className="h-8 text-sm max-w-xs"
                                            autoFocus
                                        />
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-black/70" onClick={onSaveDeptEdit}>
                                            <Check className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancelEditDept}>
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ) : (
                                    <span className="text-sm font-semibold truncate">{dept?.name || "部署なし"}</span>
                                )}
                            </button>
                            <span className="text-xs text-muted-foreground shrink-0">{members.length}名</span>
                            {dept && !isEditingDept && (
                                <div className="hidden group-hover:flex items-center gap-0.5 ml-1 shrink-0" onClick={e => e.stopPropagation()}>
                                    <button className="p-1 rounded hover:bg-muted" onClick={() => onStartEditDept(dept)}>
                                        <Pencil className="h-3 w-3 text-muted-foreground" />
                                    </button>
                                    <button className="p-1 rounded hover:bg-destructive/10" onClick={() => onDeleteDept(dept)}>
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {isExpanded && (
                            <div className="divide-y">
                                {members.map(assignee => (
                                    <AssigneeRow
                                        key={assignee.id}
                                        assignee={assignee}
                                        activeDepts={activeDepts}
                                        editingAssignee={editingAssignee}
                                        onEditingAssigneeChange={onEditingAssigneeChange}
                                        onStartEditAssignee={onStartEditAssignee}
                                        onSaveAssigneeEdit={onSaveAssigneeEdit}
                                        onToggleAssigneeActive={onToggleAssigneeActive}
                                        onDeleteAssignee={onDeleteAssignee}
                                    />
                                ))}
                            </div>
                        )}

                        {addingAssigneeForDept === addKey ? (
                            <AddAssigneeRow
                                deptId={dept?.id ?? null}
                                newAssignee={newAssignee}
                                onNewAssigneeChange={onNewAssigneeChange}
                                onAddAssignee={onAddAssignee}
                                onCancel={() => {
                                    onSetAddingAssigneeForDept(null)
                                    onNewAssigneeChange({ name: "", employeeId: "" })
                                }}
                            />
                        ) : (
                            <button
                                className={`flex items-center gap-1.5 px-4 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors w-full ${isExpanded ? "border-t" : ""}`}
                                onClick={() => {
                                    onSetAddingAssigneeForDept(addKey)
                                    onSetAddingDept(false)
                                    onNewAssigneeChange({ name: "", employeeId: "" })
                                    if (!isExpanded) onToggleDeptExpanded(expandKey)
                                }}
                            >
                                <Plus className="h-3 w-3" />
                                担当者を追加
                            </button>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
