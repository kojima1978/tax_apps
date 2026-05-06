import { Ban, Check, Pencil, RotateCcw, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import type { MasterListItem } from "@/components/master-list/types"

const ICON_BTN_MUTED = "h-8 w-8 text-muted-foreground hover:text-foreground"
const ICON_BTN_GREEN = "h-8 w-8 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
const ICON_BTN_ORANGE = "h-8 w-8 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
const ICON_BTN_DESTRUCTIVE = "h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"

export function EditActionButtons({
    onSaveEdit,
    onCancelEdit,
}: {
    onSaveEdit: () => void
    onCancelEdit: () => void
}) {
    return (
        <div className="flex items-center justify-end gap-1">
            <Button
                variant="ghost"
                size="icon"
                className={ICON_BTN_GREEN}
                onClick={onSaveEdit}
            >
                <Check className="h-4 w-4" />
            </Button>
            <Button
                variant="ghost"
                size="icon"
                className={ICON_BTN_MUTED}
                onClick={onCancelEdit}
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    )
}

export function RowActionButtons<T extends MasterListItem>({
    item,
    onStartEdit,
    onToggleActive,
    onPermanentDelete,
}: {
    item: T
    onStartEdit: (item: T) => void
    onToggleActive: (id: number) => void
    onPermanentDelete: (id: number) => void
}) {
    return (
        <div className="flex items-center justify-end gap-1">
            <Button
                variant="ghost"
                size="icon"
                className={ICON_BTN_MUTED}
                onClick={() => onStartEdit(item)}
            >
                <Pencil className="h-4 w-4" />
            </Button>
            {item.active === false ? (
                <>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={ICON_BTN_GREEN}
                        onClick={() => onToggleActive(item.id)}
                        title="有効化"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={ICON_BTN_DESTRUCTIVE}
                        onClick={() => onPermanentDelete(item.id)}
                        title="完全削除"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </>
            ) : (
                <Button
                    variant="ghost"
                    size="icon"
                    className={ICON_BTN_ORANGE}
                    onClick={() => onToggleActive(item.id)}
                    title="無効化"
                >
                    <Ban className="h-4 w-4" />
                </Button>
            )}
        </div>
    )
}
