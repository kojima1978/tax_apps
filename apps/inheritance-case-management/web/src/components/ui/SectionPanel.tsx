import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SectionPanelProps {
    title: string
    icon?: LucideIcon
    badge?: string
    compact?: boolean
    children: React.ReactNode
}

/** 見出し付きの枠。案件詳細はタブで切り替えるので、タブの中の区分はたたまない */
export function SectionPanel({ title, icon: Icon, badge, compact = false, children }: SectionPanelProps) {
    return (
        <section className="rounded-lg border">
            <div className={cn(
                "flex items-center rounded-t-lg border-b bg-muted/30",
                compact ? "gap-1.5 px-3 py-1.5" : "gap-2 px-4 py-2.5",
            )}>
                {Icon && <Icon className={cn("text-muted-foreground", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />}
                <h2 className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>{title}</h2>
                {badge && (
                    <span className={cn("rounded-full bg-primary/10 text-primary", compact ? "px-1.5 py-0.5 text-[11px]" : "px-2 py-0.5 text-xs")}>{badge}</span>
                )}
            </div>
            <div className={compact ? "px-3 py-2" : "px-4 py-3"}>{children}</div>
        </section>
    )
}
