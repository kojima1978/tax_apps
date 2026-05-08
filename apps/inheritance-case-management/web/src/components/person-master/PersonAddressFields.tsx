"use client"

import type { KeyboardEvent } from "react"
import { Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { cn } from "@/lib/utils"
import { formatPostalCodeForInput } from "@/lib/postal-code-format"

interface PersonAddressFieldsProps {
    fieldId: (field: string) => string
    postalCode: string
    addressFromPostalCode: string
    addressManual: string
    inputClassName: string
    isSearching: boolean
    onPostalCodeChange: (value: string) => void | Promise<void>
    onSearchPostalCode: () => void | Promise<void>
    onAddressFromPostalCodeChange: (value: string) => void
    onAddressManualChange: (value: string) => void
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void
    postalCodeFieldClassName?: string
    addressFromPostalCodeFieldClassName?: string
    addressManualFieldClassName?: string
    addressManualLabel?: string
    searchButtonClassName?: string
}

export function PersonAddressFields({
    fieldId,
    postalCode,
    addressFromPostalCode,
    addressManual,
    inputClassName,
    isSearching,
    onPostalCodeChange,
    onSearchPostalCode,
    onAddressFromPostalCodeChange,
    onAddressManualChange,
    onKeyDown,
    postalCodeFieldClassName,
    addressFromPostalCodeFieldClassName,
    addressManualFieldClassName,
    addressManualLabel = "住所補足（番地・建物名など）",
    searchButtonClassName = "h-10 w-10 shrink-0 rounded-md",
}: PersonAddressFieldsProps) {
    return (
        <>
            <div className={cn("space-y-1", postalCodeFieldClassName)}>
                <Label htmlFor={fieldId("postalCode")} className="text-xs text-muted-foreground">郵便番号</Label>
                <div className="flex gap-1">
                    <Input
                        id={fieldId("postalCode")}
                        value={formatPostalCodeForInput(postalCode)}
                        onChange={(e) => { void onPostalCodeChange(e.target.value) }}
                        onKeyDown={onKeyDown}
                        placeholder="000-0000"
                        inputMode="numeric"
                        maxLength={8}
                        className={inputClassName}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={searchButtonClassName}
                        disabled={isSearching}
                        onClick={() => { void onSearchPostalCode() }}
                        title="郵便番号から住所を検索"
                        aria-label="郵便番号から住所を検索"
                    >
                        {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
            <div className={cn("space-y-1", addressFromPostalCodeFieldClassName)}>
                <Label htmlFor={fieldId("addressFromPostalCode")} className="text-xs text-muted-foreground">住所（郵便番号から自動入力）</Label>
                <Input
                    id={fieldId("addressFromPostalCode")}
                    value={addressFromPostalCode}
                    onChange={(e) => onAddressFromPostalCodeChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="都道府県 市区町村 町名"
                    className={inputClassName}
                />
            </div>
            <div className={cn("space-y-1", addressManualFieldClassName)}>
                <Label htmlFor={fieldId("addressManual")} className="text-xs text-muted-foreground">{addressManualLabel}</Label>
                <Input
                    id={fieldId("addressManual")}
                    value={addressManual}
                    onChange={(e) => onAddressManualChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="番地・建物名・部屋番号"
                    className={inputClassName}
                />
            </div>
        </>
    )
}
