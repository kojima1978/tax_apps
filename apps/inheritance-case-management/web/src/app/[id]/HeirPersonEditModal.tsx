import type { Dispatch, SetStateAction } from "react"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { HeirPersonForm } from "./HeirPersonForm"
import type { HeirPersonFormState } from "./heir-list-utils"

interface HeirPersonEditModalProps {
    isOpen: boolean
    person: HeirPersonFormState
    isUpdating: boolean
    isSearching: boolean
    onClose: () => void
    onPersonChange: Dispatch<SetStateAction<HeirPersonFormState>>
    onPostalCodeChange: (value: string) => void
    onSearchPostalCode: () => void
    onSave: () => void
}

export function HeirPersonEditModal({
    isOpen,
    person,
    isUpdating,
    isSearching,
    onClose,
    onPersonChange,
    onPostalCodeChange,
    onSearchPostalCode,
    onSave,
}: HeirPersonEditModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="相続人の人物情報を編集">
            <div className="space-y-4">
                <div className="space-y-3">
                    <div className="text-sm font-semibold">人物マスタ情報</div>
                    <HeirPersonForm
                        value={person}
                        onChange={onPersonChange}
                        isSearching={isSearching}
                        onPostalCodeChange={onPostalCodeChange}
                        onSearchPostalCode={onSearchPostalCode}
                        autoFocusName
                        memoLabel="人物メモ"
                    />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" onClick={onClose} disabled={isUpdating}>キャンセル</Button>
                    <Button onClick={onSave} disabled={!person.name.trim() || isUpdating}>
                        {isUpdating ? "保存中..." : "保存"}
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
