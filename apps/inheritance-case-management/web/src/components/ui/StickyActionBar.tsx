import type { ReactNode } from "react"

export function StickyActionBar({ children, className = "" }: { children: ReactNode; className?: string }) {
    return (
        <div className={`sticky bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t mt-4 -mx-6 px-6 shadow-lg z-10 flex justify-end gap-4 ${className}`.trim()}>
            {children}
        </div>
    )
}
