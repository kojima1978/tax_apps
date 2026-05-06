import type { Dispatch, SetStateAction } from "react"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import { RelatedPartyPersonForm } from "./RelatedPartyPersonForm"
import type { RelatedPartyPersonFormState } from "./related-party-list-utils"

interface RelatedPartyPersonEditModalProps {
    isOpen: boolean
    person: RelatedPartyPersonFormState
    isUpdating: boolean
    isSearching: boolean
    onClose: () => void
    onPersonChange: Dispatch<SetStateAction<RelatedPartyPersonFormState>>
    onPostalCodeChange: (value: string) => void
    onSearchPostalCode: () => void
    onSave: () => void
}

export function RelatedPartyPersonEditModal({
    isOpen,
    person,
    isUpdating,
    isSearching,
    onClose,
    onPersonChange,
    onPostalCodeChange,
    onSearchPostalCode,
    onSave,
}: RelatedPartyPersonEditModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="関係者の人物情報を編集">
            <div className="space-y-4">
                <div className="space-y-3">
                    <div className="text-sm font-semibold">人物マスタ情報</div>
                    <RelatedPartyPersonForm
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
