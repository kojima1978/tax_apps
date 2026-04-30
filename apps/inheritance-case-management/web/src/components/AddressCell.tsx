import { cn } from "@/lib/utils"

interface AddressCellProps {
    postalCode?: string | null
    address?: string | null
    className?: string
}

export function AddressCell({ postalCode, address, className }: AddressCellProps) {
    const normalizedPostalCode = postalCode?.trim()
    const normalizedAddress = address?.trim()
    const title = [normalizedPostalCode && `〒${normalizedPostalCode}`, normalizedAddress]
        .filter(Boolean)
        .join(" ")

    if (!title) {
        return <span className="text-muted-foreground">-</span>
    }

    return (
        <div
            className={cn("w-full min-w-0 max-w-[360px] space-y-0.5", className)}
            title={title}
            aria-label={title}
        >
            {normalizedPostalCode && (
                <div className="truncate text-xs leading-4 text-muted-foreground">
                    〒{normalizedPostalCode}
                </div>
            )}
            {normalizedAddress && (
                <div className="truncate text-sm leading-5 text-foreground">
                    {normalizedAddress}
                </div>
            )}
        </div>
    )
}
