"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleSectionProps {
    title: string
    icon?: LucideIcon
    defaultOpen?: boolean
    /** 外部から制御する場合 */
    isOpen?: boolean
    onToggle?: () => void
    badge?: string
    compact?: boolean
    children: React.ReactNode
}

export function CollapsibleSection({ title, icon: Icon, defaultOpen = true, isOpen: controlledOpen, onToggle, badge, compact = false, children }: CollapsibleSectionProps) {
    const [internalOpen, setInternalOpen] = useState(defaultOpen)
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
    const handleToggle = onToggle ?? (() => setInternalOpen(v => !v))

    return (
        <div className="border rounded-lg overflow-hidden">
            <button
                type="button"
                onClick={handleToggle}
                className={cn(
                    "w-full flex items-center justify-between bg-muted/30 hover:bg-muted/50 transition-colors",
                    compact ? "px-3 py-1.5" : "px-4 py-2.5"
                )}
                aria-expanded={isOpen}
            >
                <div className={cn("flex items-center", compact ? "gap-1.5" : "gap-2")}>
                    {Icon && <Icon className={cn("text-muted-foreground", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />}
                    <span className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>{title}</span>
                    {badge && (
                        <span className={cn("bg-primary/10 text-primary rounded-full", compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs")}>{badge}</span>
                    )}
                </div>
                <ChevronDown className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4", "text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
            </button>
            <div
                className={cn(
                    "grid transition-[grid-template-rows] duration-200 ease-in-out",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
            >
                <div className="overflow-hidden">
                    <div className={compact ? "px-3 py-2" : "px-4 py-3"}>
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}
