import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/Input"

interface MasterSearchControlProps {
    value: string
    placeholder: string
    onChange: (value: string) => void
}

export function MasterSearchControl({ value, placeholder, onChange }: MasterSearchControlProps) {
    return (
        <div className="relative w-full sm:w-[420px] lg:w-[460px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-10 w-full pl-9 pr-8 text-sm"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange("")}
                    className="absolute right-2 top-1/2 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="検索条件をクリア"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}
        </div>
    )
}
