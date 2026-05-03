"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { EmptyState } from "@/components/ui/EmptyState"
import { Modal } from "@/components/ui/Modal"
import { SelectWithOther } from "@/components/ui/SelectWithOther"
import { Edit3, UserPlus, Search, Loader2, X, Plus } from "lucide-react"
import type { CaseRelatedParty, RelatedPartyPerson } from "@/types/shared"
import { createRelatedPartyPerson, updateRelatedPartyPerson } from "@/lib/api/related-party-persons"
import { applyPostalCodeAddress, normalizePersonAddressParts } from "@/lib/person-address"
import { normalizeNameKanaForStorage, personMatchesSearch } from "@/lib/person-search"
import { fetchAddressFromPostalCode } from "@/lib/postal-code"
import { formatPostalCodeForDisplay, formatPostalCodeForInput, normalizePostalCodeDigits } from "@/lib/postal-code-format"
import { RELATED_PARTY_PROFESSIONS } from "@/lib/constants/related-party-professions"

interface RelatedPartyListEditorProps {
    parties: CaseRelatedParty[]
    persons: RelatedPartyPerson[]
    onChange: (parties: CaseRelatedParty[]) => void
    onPersonsChange: (persons: RelatedPartyPerson[]) => void
}

const emptyPersonForm = {
    name: "",
    nameKana: "",
    profession: "",
    phone: "",
    postalCode: "",
    address: "",
    addressFromPostalCode: "",
    addressManual: "",
    memo: "",
}

function getDisplayAddress(parts: Parameters<typeof normalizePersonAddressParts>[0]): string {
    return normalizePersonAddressParts(parts).address
}

function withAddressFromPostalCode<T extends typeof emptyPersonForm>(person: T, addressFromPostalCode: string): T {
    return { ...person, ...normalizePersonAddressParts({ ...person, addressFromPostalCode }) }
}

function withPostalCodeLookupAddress<T extends typeof emptyPersonForm>(person: T, addressFromPostalCode: string): T {
    return { ...person, ...applyPostalCodeAddress(person, addressFromPostalCode) }
}

function withAddressManual<T extends typeof emptyPersonForm>(person: T, addressManual: string): T {
    return { ...person, ...normalizePersonAddressParts({ ...person, addressManual }) }
}

export function RelatedPartyListEditor({ parties, persons, onChange, onPersonsChange }: RelatedPartyListEditorProps) {
    const [showAddModal, setShowAddModal] = useState(false)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [newPerson, setNewPerson] = useState(emptyPersonForm)
    const [editPerson, setEditPerson] = useState(emptyPersonForm)
    const [creating, setCreating] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [searching, setSearching] = useState(false)
    const [editSearching, setEditSearching] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (showAddModal && searchInputRef.current) searchInputRef.current.focus()
    }, [showAddModal])

    const filteredPersons = persons
        .filter(p => p.active)
        .filter(p => personMatchesSearch(p, searchQuery))

    const handleAddPerson = (person: RelatedPartyPerson) => {
        const newParty: CaseRelatedParty = {
            id: 0,
            sortOrder: parties.length,
            personId: person.id,
            person,
            memo: "",
        }
        onChange([...parties, newParty])
        setShowAddModal(false)
        setSearchQuery("")
    }

    const openEditModal = (index: number) => {
        const person = parties[index].person
        setEditingIndex(index)
        setEditPerson({
            name: person.name,
            nameKana: person.nameKana || "",
            profession: person.profession || "",
            phone: person.phone,
            postalCode: person.postalCode,
            ...normalizePersonAddressParts(person),
            memo: person.memo,
        })
    }

    const handleCreateAndAdd = async () => {
        if (!newPerson.name.trim()) return
        setCreating(true)
        try {
            const payload = {
                ...newPerson,
                ...normalizePersonAddressParts(newPerson),
                name: newPerson.name.trim(),
                nameKana: normalizeNameKanaForStorage(newPerson.nameKana),
            }
            const created = await createRelatedPartyPerson(payload)
            onPersonsChange([...persons, created])
            handleAddPerson(created)
            setNewPerson(emptyPersonForm)
            setShowCreateForm(false)
        } catch {
            // error handled by caller
        } finally {
            setCreating(false)
        }
    }

    const handleUpdatePerson = async () => {
        if (editingIndex == null || !editPerson.name.trim()) return
        const party = parties[editingIndex]
        setUpdating(true)
        try {
            const payload = {
                ...editPerson,
                ...normalizePersonAddressParts(editPerson),
                name: editPerson.name.trim(),
                nameKana: normalizeNameKanaForStorage(editPerson.nameKana),
            }
            const updated = await updateRelatedPartyPerson(party.personId, payload)
            onPersonsChange(persons.map(p => p.id === updated.id ? updated : p))
            onChange(parties.map((rp, i) => i === editingIndex ? { ...rp, person: updated } : rp))
            setEditingIndex(null)
        } finally {
            setUpdating(false)
        }
    }

    const handlePostalCodeChange = async (value: string) => {
        const digits = normalizePostalCodeDigits(value)
        setNewPerson(prev => ({ ...prev, postalCode: digits }))
        if (digits.length === 7) {
            setSearching(true)
            const address = await fetchAddressFromPostalCode(digits)
            if (address) setNewPerson(prev => withPostalCodeLookupAddress({ ...prev, postalCode: digits }, address))
            setSearching(false)
        }
    }

    const handleEditPostalCodeChange = async (value: string) => {
        const digits = normalizePostalCodeDigits(value)
        setEditPerson(prev => ({ ...prev, postalCode: digits }))
        if (digits.length === 7) {
            setEditSearching(true)
            const address = await fetchAddressFromPostalCode(digits)
            if (address) setEditPerson(prev => withPostalCodeLookupAddress({ ...prev, postalCode: digits }, address))
            setEditSearching(false)
        }
    }

    const handleRemove = (index: number) => {
        if (!confirm("この関係者を案件から外しますか？（人物マスタからは削除されません）")) return
        onChange(parties.filter((_, i) => i !== index))
    }

    const handleMemoChange = (index: number, memo: string) => {
        const updated = [...parties]
        updated[index] = { ...updated[index], memo }
        onChange(updated)
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => { setShowAddModal(true); setShowCreateForm(false); setSearchQuery("") }}>
                    <Plus className="h-3.5 w-3.5 mr-1" />関係者を追加
                </Button>
            </div>

            {parties.map((p, index) => (
                <div key={`${p.personId}-${index}`} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="truncate text-sm font-medium">{p.person.name}</span>
                                        {p.person.profession && (
                                            <span className="inline-flex shrink-0 items-center rounded border border-border bg-muted/40 px-1.5 py-0 text-[10px] text-muted-foreground">{p.person.profession}</span>
                                        )}
                                    </div>
                                    {p.person.nameKana && (
                                        <div className="truncate text-xs text-muted-foreground">{p.person.nameKana}</div>
                                    )}
                                </div>
                                {p.person.phone && <span className="text-xs text-muted-foreground">{p.person.phone}</span>}
                            </div>
                            {(p.person.postalCode || getDisplayAddress(p.person)) && (
                                <p className="text-xs text-muted-foreground truncate">
                                    {p.person.postalCode && `${formatPostalCodeForDisplay(p.person.postalCode)} `}{getDisplayAddress(p.person)}
                                </p>
                            )}
                            {p.person.memo && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.person.memo}</p>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            <button
                                type="button"
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                onClick={() => openEditModal(index)}
                                title="人物情報を編集"
                            >
                                <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemove(index)}
                                title="この関係者を外す"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">この案件でのメモ</Label>
                        <Input
                            value={p.memo}
                            onChange={(e) => handleMemoChange(index, e.target.value)}
                            placeholder="案件固有のメモ"
                            className="h-9 text-xs"
                        />
                    </div>
                </div>
            ))}

            {parties.length === 0 && (
                <EmptyState
                    icon={UserPlus}
                    title="関係者が登録されていません"
                    description="税理士・司法書士・不動産業者など、案件に関わる外部の関係者を登録できます"
                    action={{ label: "+ 追加", onClick: () => setShowAddModal(true) }}
                />
            )}

            <Modal isOpen={editingIndex != null} onClose={() => setEditingIndex(null)} title="関係者の人物情報を編集">
                <div className="space-y-4">
                    <div className="space-y-3">
                        <div className="text-sm font-semibold">人物マスタ情報</div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label>氏名 *</Label>
                                <Input value={editPerson.name} onChange={e => setEditPerson(p => ({ ...p, name: e.target.value }))} placeholder="氏名" autoFocus />
                            </div>
                            <div className="space-y-1.5">
                                <Label>フリガナ</Label>
                                <Input value={editPerson.nameKana} onChange={e => setEditPerson(p => ({ ...p, nameKana: e.target.value }))} placeholder="ヤマダ タロウ" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>業種</Label>
                                <SelectWithOther
                                    options={RELATED_PARTY_PROFESSIONS}
                                    value={editPerson.profession}
                                    onChange={v => setEditPerson(p => ({ ...p, profession: v }))}
                                    placeholder="業種を選択"
                                    otherPlaceholder="業種を入力"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>電話番号</Label>
                                <Input value={editPerson.phone} onChange={e => setEditPerson(p => ({ ...p, phone: e.target.value }))} placeholder="090-0000-0000" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[150px_1fr]">
                            <div className="space-y-1.5">
                                <Label>郵便番号</Label>
                                <div className="flex gap-1">
                                    <Input value={formatPostalCodeForInput(editPerson.postalCode)} onChange={e => handleEditPostalCodeChange(e.target.value)} placeholder="000-0000" inputMode="numeric" maxLength={8} className="flex-1" />
                                    <Button type="button" variant="ghost" size="sm" className="px-2 h-9 shrink-0" disabled={editSearching}
                                        onClick={async () => { setEditSearching(true); const a = await fetchAddressFromPostalCode(editPerson.postalCode); if (a) setEditPerson(p => withPostalCodeLookupAddress(p, a)); setEditSearching(false) }}>
                                        {editSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>住所（郵便番号から自動入力）</Label>
                                <Input value={editPerson.addressFromPostalCode} onChange={e => setEditPerson(p => withAddressFromPostalCode(p, e.target.value))} placeholder="都道府県 市区町村 町名" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>住所補足（番地・建物名など手入力）</Label>
                            <Input value={editPerson.addressManual} onChange={e => setEditPerson(p => withAddressManual(p, e.target.value))} placeholder="番地・建物名・部屋番号" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>人物メモ</Label>
                            <textarea value={editPerson.memo} onChange={e => setEditPerson(p => ({ ...p, memo: e.target.value }))}
                                placeholder="備考・メールアドレス等" rows={2}
                                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-y focus:outline-none focus:ring-1 focus:ring-primary min-h-[56px]" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => setEditingIndex(null)} disabled={updating}>キャンセル</Button>
                        <Button onClick={handleUpdatePerson} disabled={!editPerson.name.trim() || updating}>
                            {updating ? "保存中..." : "保存"}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="関係者を追加">
                {showCreateForm ? (
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label>氏名 *</Label>
                                <Input value={newPerson.name} onChange={e => setNewPerson(p => ({ ...p, name: e.target.value }))} placeholder="氏名" autoFocus />
                            </div>
                            <div className="space-y-1.5">
                                <Label>フリガナ</Label>
                                <Input value={newPerson.nameKana} onChange={e => setNewPerson(p => ({ ...p, nameKana: e.target.value }))} placeholder="ヤマダ タロウ" />
                            </div>
                            <div className="space-y-1.5">
                                <Label>業種</Label>
                                <SelectWithOther
                                    options={RELATED_PARTY_PROFESSIONS}
                                    value={newPerson.profession}
                                    onChange={v => setNewPerson(p => ({ ...p, profession: v }))}
                                    placeholder="業種を選択"
                                    otherPlaceholder="業種を入力"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>電話番号</Label>
                                <Input value={newPerson.phone} onChange={e => setNewPerson(p => ({ ...p, phone: e.target.value }))} placeholder="090-0000-0000" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[150px_1fr]">
                            <div className="space-y-1.5">
                                <Label>郵便番号</Label>
                                <div className="flex gap-1">
                                    <Input value={formatPostalCodeForInput(newPerson.postalCode)} onChange={e => handlePostalCodeChange(e.target.value)} placeholder="000-0000" inputMode="numeric" maxLength={8} className="flex-1" />
                                    <Button type="button" variant="ghost" size="sm" className="px-2 h-9 shrink-0" disabled={searching}
                                        onClick={async () => { setSearching(true); const a = await fetchAddressFromPostalCode(newPerson.postalCode); if (a) setNewPerson(p => withPostalCodeLookupAddress(p, a)); setSearching(false) }}>
                                        {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>住所（郵便番号から自動入力）</Label>
                                <Input value={newPerson.addressFromPostalCode} onChange={e => setNewPerson(p => withAddressFromPostalCode(p, e.target.value))} placeholder="都道府県 市区町村 町名" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label>住所補足（番地・建物名など手入力）</Label>
                            <Input value={newPerson.addressManual} onChange={e => setNewPerson(p => withAddressManual(p, e.target.value))} placeholder="番地・建物名・部屋番号" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>メモ</Label>
                            <textarea value={newPerson.memo} onChange={e => setNewPerson(p => ({ ...p, memo: e.target.value }))}
                                placeholder="備考・メールアドレス等" rows={2}
                                className="w-full border rounded-md px-3 py-2 text-sm bg-background resize-y focus:outline-none focus:ring-1 focus:ring-primary min-h-[56px]" />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="ghost" onClick={() => setShowCreateForm(false)} disabled={creating}>戻る</Button>
                            <Button onClick={handleCreateAndAdd} disabled={!newPerson.name.trim() || creating}>
                                {creating ? "作成中..." : "作成して追加"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <Input ref={searchInputRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="氏名・フリガナ・業種・電話番号・住所で検索" className="flex-1" />
                            <Button variant="outline" size="sm" onClick={() => { setShowCreateForm(true); setNewPerson({ ...emptyPersonForm, name: searchQuery }) }}>
                                <UserPlus className="h-3.5 w-3.5 mr-1" />新規作成
                            </Button>
                        </div>
                        <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
                            {filteredPersons.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-6">
                                    {searchQuery ? "該当する人物が見つかりません" : "登録済みの人物がありません"}
                                </p>
                            ) : (
                                filteredPersons.map(person => (
                                    <button
                                        key={person.id}
                                        type="button"
                                        className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors"
                                        onClick={() => handleAddPerson(person)}
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
                                        {getDisplayAddress(person) && (
                                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{getDisplayAddress(person)}</p>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}
