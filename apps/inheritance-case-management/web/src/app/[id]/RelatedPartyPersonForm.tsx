import type { Dispatch, SetStateAction } from "react"
import { Label } from "@/components/ui/Label"
import { SelectWithOther } from "@/components/ui/SelectWithOther"
import { RELATED_PARTY_PROFESSIONS } from "@/lib/constants/related-party-professions"
import { CasePersonForm } from "./CasePersonForm"
import type { RelatedPartyPersonFormState } from "./related-party-list-utils"

interface RelatedPartyPersonFormProps {
    value: RelatedPartyPersonFormState
    onChange: Dispatch<SetStateAction<RelatedPartyPersonFormState>>
    isSearching: boolean
    onPostalCodeChange: (value: string) => void
    onSearchPostalCode: () => void
    autoFocusName?: boolean
    memoLabel: string
}

export function RelatedPartyPersonForm({
    value,
    onChange,
    isSearching,
    onPostalCodeChange,
    onSearchPostalCode,
    autoFocusName,
    memoLabel,
}: RelatedPartyPersonFormProps) {
    return (
        <CasePersonForm
            value={value}
            onChange={onChange}
            isSearching={isSearching}
            onPostalCodeChange={onPostalCodeChange}
            onSearchPostalCode={onSearchPostalCode}
            autoFocusName={autoFocusName}
            memoLabel={memoLabel}
            identityFields={(
                <div className="space-y-1.5">
                    <Label>業種</Label>
                    <SelectWithOther
                        options={RELATED_PARTY_PROFESSIONS}
                        value={value.profession}
                        onChange={profession => onChange(person => ({ ...person, profession }))}
                        placeholder="業種を選択"
                        otherPlaceholder="業種を入力"
                    />
                </div>
            )}
        />
    )
}
