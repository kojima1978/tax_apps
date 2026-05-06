import { Edit3, X } from "lucide-react"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { formatPostalCodeForDisplay } from "@/lib/postal-code-format"
import type { CaseRelatedParty } from "@/types/shared"
import { getDisplayAddress } from "./case-person-utils"

interface RelatedPartyCardProps {
    party: CaseRelatedParty
    index: number
    onEdit: (index: number) => void
    onRemove: (index: number) => void
    onMemoChange: (index: number, memo: string) => void
}

export function RelatedPartyCard({ party, index, onEdit, onRemove, onMemoChange }: RelatedPartyCardProps) {
    const address = getDisplayAddress(party.person)

    return (
        <div className="p-3 border rounded-lg space-y-2">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <span className="truncate text-sm font-medium">{party.person.name}</span>
                                {party.person.profession && (
                                    <span className="inline-flex shrink-0 items-center rounded border border-border bg-muted/40 px-1.5 py-0 text-[10px] text-muted-foreground">{party.person.profession}</span>
                                )}
                            </div>
                            {party.person.nameKana && (
                                <div className="truncate text-xs text-muted-foreground">{party.person.nameKana}</div>
                            )}
                        </div>
                        {party.person.phone && <span className="text-xs text-muted-foreground">{party.person.phone}</span>}
                    </div>
                    {(party.person.postalCode || address) && (
                        <p className="text-xs text-muted-foreground truncate">
                            {party.person.postalCode && `${formatPostalCodeForDisplay(party.person.postalCode)} `}{address}
                        </p>
                    )}
                    {party.person.memo && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{party.person.memo}</p>
                    )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <button
                        type="button"
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                        onClick={() => onEdit(index)}
                        title="人物情報を編集"
                    >
                        <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        onClick={() => onRemove(index)}
                        title="この関係者を外す"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
            <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">この案件でのメモ</Label>
                <Input
                    value={party.memo}
                    onChange={(e) => onMemoChange(index, e.target.value)}
                    placeholder="案件固有のメモ"
                    className="h-9 text-xs"
                />
            </div>
        </div>
    )
}
