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
        <span className={`inline-flex items-center gap-1 rounded-full border border-black/10 px-2 py-0.5 text-[11px] font-medium leading-none ${style.bg} ${style.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
            {label}
        </span>
    )
}
