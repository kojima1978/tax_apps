import CurrencyInput, { type CurrencyInputProps } from 'react-currency-input-field';
import { cn } from "@/lib/utils";

type CurrencyFieldProps = Omit<CurrencyInputProps, 'decimalsLimit' | 'intlConfig'> & {
    decimalsLimit?: number;
};

export function CurrencyField({ className, decimalsLimit = 0, ...props }: CurrencyFieldProps) {
    return (
        <CurrencyInput
            className={cn(
                "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className,
            )}
            decimalsLimit={decimalsLimit}
            intlConfig={{ locale: 'ja-JP', currency: 'JPY' }}
            {...props}
        />
    );
}
