"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export interface CaseSectionNavigationItem {
    id: string
    label: string
    sectionKey: string
}

interface CaseSectionNavigationProps {
    items: readonly CaseSectionNavigationItem[]
    onOpenSection: (sectionKey: string) => void
}

export function CaseSectionNavigation({ items, onOpenSection }: CaseSectionNavigationProps) {
    const [activeId, setActiveId] = useState(items[0]?.id ?? "")

    useEffect(() => {
        let frameId = 0

        const updateActiveSection = () => {
            frameId = 0
            const activationLine = 128
            let nextId = items[0]?.id ?? ""

            for (const item of items) {
                const element = document.getElementById(item.id)
                if (element && element.getBoundingClientRect().top <= activationLine) {
                    nextId = item.id
                } else {
                    break
                }
            }

            setActiveId((current) => current === nextId ? current : nextId)
        }

        const onScroll = () => {
            if (frameId === 0) {
                frameId = window.requestAnimationFrame(updateActiveSection)
            }
        }

        updateActiveSection()
        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", onScroll)

        return () => {
            window.removeEventListener("scroll", onScroll)
            window.removeEventListener("resize", onScroll)
            if (frameId !== 0) window.cancelAnimationFrame(frameId)
        }
    }, [items])

    const navigateToSection = (item: CaseSectionNavigationItem) => {
        onOpenSection(item.sectionKey)
        setActiveId(item.id)

        window.requestAnimationFrame(() => {
            document.getElementById(item.id)?.scrollIntoView({ block: "start" })
            window.history.replaceState(null, "", `#${item.id}`)
        })
    }

    return (
        <nav
            aria-label="案件詳細のページ内メニュー"
            className="sticky top-14 z-30 -mx-3 border-y bg-card/95 px-3 py-1.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/85 lg:-mx-3.5 lg:px-3.5"
        >
            <div className="flex items-center gap-1 overflow-x-auto">
                <span className="mr-1 hidden shrink-0 text-[11px] font-semibold text-muted-foreground sm:inline">
                    ページ内
                </span>
                {items.map((item) => {
                    const isActive = activeId === item.id
                    return (
                        <a
                            key={item.id}
                            href={`#${item.id}`}
                            aria-current={isActive ? "location" : undefined}
                            onClick={(event) => {
                                event.preventDefault()
                                navigateToSection(item)
                            }}
                            className={cn(
                                "flex min-h-11 shrink-0 items-center rounded-md px-2.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 sm:min-h-8",
                                isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                        >
                            {item.label}
                        </a>
                    )
                })}
            </div>
        </nav>
    )
}
