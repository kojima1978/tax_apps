import { cn } from "@/lib/utils"
import { normalizePersonAddressParts } from "@/lib/person-address"
import { formatPostalCodeForDisplay } from "@/lib/postal-code-format"

interface AddressCellProps {
    postalCode?: string | null
    address?: string | null
    addressFromPostalCode?: string | null
    addressManual?: string | null
    className?: string
}

export function AddressCell({ postalCode, address, addressFromPostalCode, addressManual, className }: AddressCellProps) {
    const formattedPostalCode = formatPostalCodeForDisplay(postalCode)
    const { address: normalizedAddress } = normalizePersonAddressParts({
        address,
        addressFromPostalCode,
        addressManual,
    })
    const title = [formattedPostalCode, normalizedAddress]
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
            {formattedPostalCode && (
                <div className="truncate text-xs leading-4 text-muted-foreground">
                    {formattedPostalCode}
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
