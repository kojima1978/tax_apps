import type { Dispatch, RefObject, SetStateAction } from "react"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import type { HeirPerson } from "@/types/shared"
import { HeirPersonForm } from "./HeirPersonForm"
import {
    emptyHeirPersonForm,
    getDisplayAddress,
    type HeirPersonFormState,
} from "./heir-list-utils"

interface HeirAddModalProps {
    isOpen: boolean
    showCreateForm: boolean
    searchInputRef: RefObject<HTMLInputElement | null>
    searchQuery: string
    filteredPersons: HeirPerson[]
    newPerson: HeirPersonFormState
    isCreating: boolean
    isSearching: boolean
    onClose: () => void
    onSearchQueryChange: (value: string) => void
    onShowCreateFormChange: (show: boolean) => void
    onNewPersonChange: Dispatch<SetStateAction<HeirPersonFormState>>
    onAddPerson: (person: HeirPerson) => void
    onCreateAndAdd: () => void
    onPostalCodeChange: (value: string) => void
    onSearchPostalCode: () => void
}

export function HeirAddModal({
    isOpen,
    showCreateForm,
    searchInputRef,
    searchQuery,
    filteredPersons,
    newPerson,
    isCreating,
    isSearching,
    onClose,
    onSearchQueryChange,
    onShowCreateFormChange,
    onNewPersonChange,
    onAddPerson,
    onCreateAndAdd,
    onPostalCodeChange,
    onSearchPostalCode,
}: HeirAddModalProps) {
    const handleStartCreate = () => {
        onShowCreateFormChange(true)
        onNewPersonChange({ ...emptyHeirPersonForm, name: searchQuery })
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="相続人を追加">
            {showCreateForm ? (
                <div className="space-y-3">
                    <HeirPersonForm
                        value={newPerson}
                        onChange={onNewPersonChange}
                        isSearching={isSearching}
                        onPostalCodeChange={onPostalCodeChange}
                        onSearchPostalCode={onSearchPostalCode}
                        autoFocusName
                        memoLabel="メモ"
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => onShowCreateFormChange(false)} disabled={isCreating}>戻る</Button>
                        <Button onClick={onCreateAndAdd} disabled={!newPerson.name.trim() || isCreating}>
                            {isCreating ? "作成中..." : "作成して追加"}
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <Input
                            ref={searchInputRef}
                            value={searchQuery}
                            onChange={e => onSearchQueryChange(e.target.value)}
                            placeholder="氏名・フリガナ・電話番号・住所で検索"
                            className="flex-1"
                        />
                        <Button variant="outline" size="sm" onClick={handleStartCreate}>
                            <UserPlus className="h-3.5 w-3.5 mr-1" />新規作成
                        </Button>
                    </div>
                    <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
                        {filteredPersons.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-6">
                                {searchQuery ? "該当する人物が見つかりません" : "登録済みの人物がありません"}
                            </p>
                        ) : (
                            filteredPersons.map(person => {
                                const address = getDisplayAddress(person)
                                return (
                                    <button
                                        key={person.id}
                                        type="button"
                                        className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors"
                                        onClick={() => onAddPerson(person)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-medium">{person.name}</div>
                                                {person.nameKana && (
                                                    <div className="truncate text-xs text-muted-foreground">{person.nameKana}</div>
                                                )}
                                            </div>
                                            {person.phone && <span className="text-xs text-muted-foreground">{person.phone}</span>}
                                        </div>
                                        {address && (
                                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{address}</p>
                                        )}
                                    </button>
                                )
                            })
                        )}
                    </div>
                </div>
            )}
        </Modal>
    )
}
