import type { Assignee } from "@/types/shared"

export function AssigneeRow({ assignee }: { assignee: Assignee }) {
    return (
        <div className={`flex items-center gap-3 px-4 py-2 ${assignee.active === false ? "bg-muted/50 opacity-60" : ""}`}>
            <span className="text-xs text-muted-foreground w-12 shrink-0 font-mono">{assignee.employeeId || "-"}</span>
            <span className="text-sm flex-1 font-medium">{assignee.name}</span>
            {assignee.active === false && <span className="text-xs text-muted-foreground shrink-0">退職</span>}
        </div>
    )
}
