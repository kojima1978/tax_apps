"use client"

import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react"
import { Loader2, Search, MapPin } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { combinePersonAddress } from "@/lib/person-address"
import { fetchPostalCodeFromAddress } from "@/lib/postal-code"
import { formatPostalCodeForInput } from "@/lib/postal-code-format"
import {
    type BasePersonFormState,
    withAddressFromPostalCode,
    withAddressManual,
} from "./case-person-utils"

interface CasePersonFormProps<T extends BasePersonFormState> {
    value: T
    onChange: Dispatch<SetStateAction<T>>
    isSearching: boolean
    onPostalCodeChange: (value: string) => void
    onSearchPostalCode: () => void
    autoFocusName?: boolean
    memoLabel: string
    identityFields?: ReactNode
    afterIdentityFields?: ReactNode
}

export function CasePersonForm<T extends BasePersonFormState>({
    value,
    onChange,
    isSearching,
    onPostalCodeChange,
    onSearchPostalCode,
    autoFocusName,
    memoLabel,
    identityFields,
    afterIdentityFields,
}: CasePersonFormProps<T>) {
    const [isPostalSearching, setIsPostalSearching] = useState(false)

    const handleSearchPostalByAddress = async () => {
        const address = combinePersonAddress(value.addressFromPostalCode, value.addressManual)
        if (!address.trim()) return
        setIsPostalSearching(true)
        try {
            const postalCode = await fetchPostalCodeFromAddress(address)
            if (postalCode) onChange(person => ({ ...person, postalCode }))
        } finally {
            setIsPostalSearching(false)
        }
    }

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label>氏名 *</Label>
                    <Input
                        value={value.name}
                        onChange={e => onChange(person => ({ ...person, name: e.target.value }))}
                        placeholder="氏名"
                        autoFocus={autoFocusName}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label>フリガナ</Label>
                    <Input
                        value={value.nameKana}
                        onChange={e => onChange(person => ({ ...person, nameKana: e.target.value }))}
                        placeholder="ヤマダ タロウ"
                    />
                </div>
                {identityFields}
                <div className="space-y-1.5">
                    <Label>電話番号</Label>
                    <Input
                        value={value.phone}
                        onChange={e => onChange(person => ({ ...person, phone: e.target.value }))}
                        placeholder="090-0000-0000"
                    />
                </div>
            </div>
            {afterIdentityFields}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[150px_1fr]">
                <div className="space-y-1.5">
                    <Label>郵便番号</Label>
                    <div className="flex gap-1">
                        <Input
                            value={formatPostalCodeForInput(value.postalCode)}
                            onChange={e => onPostalCodeChange(e.target.value)}
                            placeholder="000-0000"
                            inputMode="numeric"
                            maxLength={8}
                            className="flex-1"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="px-2 h-9 shrink-0"
                            disabled={isSearching}
                            onClick={onSearchPostalCode}
                        >
                            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
                <div className="space-y-1.5">
                    <Label>住所（郵便番号から自動入力）</Label>
                    <div className="flex gap-1">
                        <Input
                            value={value.addressFromPostalCode}
                            onChange={e => onChange(person => withAddressFromPostalCode(person, e.target.value))}
                            placeholder="都道府県 市区町村 町名"
                            className="flex-1"
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="px-2 h-9 shrink-0"
                            disabled={isPostalSearching}
                            onClick={handleSearchPostalByAddress}
                            title="住所から郵便番号を推測"
                            aria-label="住所から郵便番号を推測"
                        >
                            {isPostalSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                        </Button>
                    </div>
                </div>
            </div>
            <div className="space-y-1.5">
                <Label>住所補足（番地・建物名など手入力）</Label>
                <Input
                    value={value.addressManual}
                    onChange={e => onChange(person => withAddressManual(person, e.target.value))}
                    placeholder="番地・建物名・部屋番号"
                />
            </div>
            <div className="space-y-1.5">
                <Label>{memoLabel}</Label>
                <textarea
                    value={value.memo}
                    onChange={e => onChange(person => ({ ...person, memo: e.target.value }))}
                    placeholder="備考・メールアドレス等"
                    rows={2}
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-y focus:outline-none focus:ring-1 focus:ring-primary min-h-[56px]"
                />
            </div>
        </div>
    )
}
