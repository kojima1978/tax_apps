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
    children: React.ReactNode
}

export function CollapsibleSection({ title, icon: Icon, defaultOpen = true, isOpen: controlledOpen, onToggle, badge, children }: CollapsibleSectionProps) {
    const [internalOpen, setInternalOpen] = useState(defaultOpen)
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
    const handleToggle = onToggle ?? (() => setInternalOpen(v => !v))

    return (
        <div className="border rounded-lg overflow-hidden">
            <button
                type="button"
                onClick={handleToggle}
                className="w-full flex items-center justify-between px-5 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                aria-expanded={isOpen}
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-semibold text-sm">{title}</span>
                    {badge && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{badge}</span>
                    )}
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
            </button>
            <div
                className={cn(
                    "grid transition-[grid-template-rows] duration-200 ease-in-out",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
            >
                <div className="overflow-hidden">
                    <div className="px-5 py-4">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}
