interface BadgeStyle {
    dot: string
    bg: string
    text: string
}

interface StatusBadgeProps {
    label: string
    style: BadgeStyle
}

export function StatusBadge({ label, style }: StatusBadgeProps) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            {label}
        </span>
    )
}
