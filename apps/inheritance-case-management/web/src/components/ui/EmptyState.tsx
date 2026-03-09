import type { LucideIcon } from "lucide-react"
import { Button } from "./Button"
import Link from "next/link"

interface EmptyStateAction {
    label: string
    onClick?: () => void
    href?: string
}

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description?: string
    action?: EmptyStateAction
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4">
            <Icon className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-base font-medium text-muted-foreground mb-1">{title}</h3>
            {description && (
                <p className="text-sm text-muted-foreground/70 mb-4">{description}</p>
            )}
            {action && (
                action.href ? (
                    <Link href={action.href}>
                        <Button variant="outline" size="sm">{action.label}</Button>
                    </Link>
                ) : action.onClick ? (
                    <Button variant="outline" size="sm" onClick={action.onClick}>{action.label}</Button>
                ) : null
            )}
        </div>
    )
}
