"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface CollapsibleSectionProps {
    title: string
    icon?: LucideIcon
    defaultOpen?: boolean
    badge?: string
    children: React.ReactNode
}

export function CollapsibleSection({ title, icon: Icon, defaultOpen = true, badge, children }: CollapsibleSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen)

    return (
        <div className="border rounded-lg overflow-hidden">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-5 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
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
            {isOpen && (
                <div className="px-5 py-4">
                    {children}
                </div>
            )}
        </div>
    )
}
