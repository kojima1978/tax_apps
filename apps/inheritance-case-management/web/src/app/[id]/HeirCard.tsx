import { Edit3, X } from "lucide-react"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { SelectWithOther } from "@/components/ui/SelectWithOther"
import { ageOnDate } from "@/lib/age"
import { formatPostalCodeForDisplay } from "@/lib/postal-code-format"
import type { CaseHeir } from "@/types/shared"
import { getDisplayAddress } from "./case-person-utils"
import { HEIR_RELATIONSHIP_LABELS } from "./heir-list-utils"

interface HeirCardProps {
    heir: CaseHeir
    index: number
    dateOfDeath?: string
    onEdit: (index: number) => void
    onRemove: (index: number) => void
    onMemoChange: (index: number, memo: string) => void
    onRelationshipChange: (index: number, relationship: string) => void
}

export function HeirCard({
    heir,
    index,
    dateOfDeath,
    onEdit,
    onRemove,
    onMemoChange,
    onRelationshipChange,
}: HeirCardProps) {
    const age = ageOnDate(heir.person.dateOfBirth, dateOfDeath)
    const address = getDisplayAddress(heir.person)

    return (
        <div className="p-3 border rounded-lg space-y-2">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{heir.person.name}</div>
                            {(heir.person.nameKana || age != null) && (
                                <div className="truncate text-xs text-muted-foreground">
                                    {heir.person.nameKana}
                                    {age != null && (
                                        <span className={heir.person.nameKana ? "ml-1" : ""}>（{age}歳）</span>
                                    )}
                                </div>
                            )}
                        </div>
                        {heir.person.phone && <span className="text-xs text-muted-foreground">{heir.person.phone}</span>}
                    </div>
                    {(heir.person.postalCode || address) && (
                        <p className="text-xs text-muted-foreground truncate">
                            {heir.person.postalCode && `${formatPostalCodeForDisplay(heir.person.postalCode)} `}{address}
                        </p>
                    )}
                    {heir.person.memo && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{heir.person.memo}</p>
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
                        title="この相続人を外す"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-2">
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">続柄</Label>
                    <SelectWithOther
                        options={HEIR_RELATIONSHIP_LABELS}
                        value={heir.relationship || ""}
                        onChange={(value) => onRelationshipChange(index, value)}
                        placeholder="続柄を選択"
                    />
                </div>
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">この案件でのメモ</Label>
                    <Input
                        value={heir.memo}
                        onChange={(e) => onMemoChange(index, e.target.value)}
                        placeholder="案件固有のメモ"
                        className="h-9 text-xs"
                    />
                </div>
            </div>
        </div>
    )
}
