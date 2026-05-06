import type { Dispatch, SetStateAction } from "react"
import { JpDateInput } from "@/components/ui/JpDateInput"
import { Label } from "@/components/ui/Label"
import { CasePersonForm } from "./CasePersonForm"
import type { HeirPersonFormState } from "./heir-list-utils"

interface HeirPersonFormProps {
    value: HeirPersonFormState
    onChange: Dispatch<SetStateAction<HeirPersonFormState>>
    isSearching: boolean
    onPostalCodeChange: (value: string) => void
    onSearchPostalCode: () => void
    autoFocusName?: boolean
    memoLabel: string
}

export function HeirPersonForm({
    value,
    onChange,
    isSearching,
    onPostalCodeChange,
    onSearchPostalCode,
    autoFocusName,
    memoLabel,
}: HeirPersonFormProps) {
    return (
        <CasePersonForm
            value={value}
            onChange={onChange}
            isSearching={isSearching}
            onPostalCodeChange={onPostalCodeChange}
            onSearchPostalCode={onSearchPostalCode}
            autoFocusName={autoFocusName}
            memoLabel={memoLabel}
            afterIdentityFields={(
                <div className="space-y-1.5">
                    <Label>生年月日</Label>
                    <JpDateInput
                        value={value.dateOfBirth}
                        onChange={(dateOfBirth) => onChange(person => ({ ...person, dateOfBirth }))}
                    />
                </div>
            )}
        />
    )
}
