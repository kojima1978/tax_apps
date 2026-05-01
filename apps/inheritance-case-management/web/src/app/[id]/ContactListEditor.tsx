"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { EmptyState } from "@/components/ui/EmptyState"
import { Modal } from "@/components/ui/Modal"
import { Edit3, UserPlus, Search, Loader2, X, Plus } from "lucide-react"
import type { CaseContact, Person } from "@/types/shared"
import { createPerson, updatePerson } from "@/lib/api/persons"
import { applyPostalCodeAddress, normalizePersonAddressParts } from "@/lib/person-address"
import { normalizeNameKanaForStorage, personMatchesSearch } from "@/lib/person-search"
import { fetchAddressFromPostalCode } from "@/lib/postal-code"

interface ContactListEditorProps {
    caseContacts: CaseContact[]
    persons: Person[]
    onChange: (contacts: CaseContact[]) => void
    onPersonsChange: (persons: Person[]) => void
}

const emptyPersonForm = {
    name: "",
    nameKana: "",
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
    return {
        ...person,
        ...normalizePersonAddressParts({ ...person, addressFromPostalCode }),
    }
}

function withPostalCodeLookupAddress<T extends typeof emptyPersonForm>(person: T, addressFromPostalCode: string): T {
    return {
        ...person,
        ...applyPostalCodeAddress(person, addressFromPostalCode),
    }
}

function withAddressManual<T extends typeof emptyPersonForm>(person: T, addressManual: string): T {
    return {
        ...person,
        ...normalizePersonAddressParts({ ...person, addressManual }),
    }
}

export function ContactListEditor({ caseContacts, persons, onChange, onPersonsChange }: ContactListEditorProps) {
    const [showAddModal, setShowAddModal] = useState(false)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [editingContactIndex, setEditingContactIndex] = useState<number | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [newPerson, setNewPerson] = useState(emptyPersonForm)
    const [editPerson, setEditPerson] = useState(emptyPersonForm)
    const [creating, setCreating] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [searching, setSearching] = useState(false)
    const [editSearching, setEditSearching] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (showAddModal && searchInputRef.current) {
            searchInputRef.current.focus()
        }
    }, [showAddModal])

    const linkedPersonIds = new Set(caseContacts.map(c => c.personId))

    const filteredPersons = persons
        .filter(p => p.active && !linkedPersonIds.has(p.id))
        .filter(p => personMatchesSearch(p, searchQuery))

    const handleAddPerson = (person: Person) => {
        const newContact: CaseContact = {
            id: 0,
            sortOrder: caseContacts.length,
            personId: person.id,
            person,
            memo: "",
        }
        onChange([...caseContacts, newContact])
        setShowAddModal(false)
        setSearchQuery("")
    }

    const openEditModal = (index: number) => {
        const person = caseContacts[index].person
        setEditingContactIndex(index)
        setEditPerson({
            name: person.name,
            nameKana: person.nameKana || "",
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
            const created = await createPerson(payload)
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
        if (editingContactIndex == null || !editPerson.name.trim()) return
        const contact = caseContacts[editingContactIndex]
        setUpdating(true)
        try {
            const payload = {
                ...editPerson,
                ...normalizePersonAddressParts(editPerson),
                name: editPerson.name.trim(),
                nameKana: normalizeNameKanaForStorage(editPerson.nameKana),
            }
            const updated = await updatePerson(contact.personId, payload)
            onPersonsChange(persons.map(p => p.id === updated.id ? updated : p))
            onChange(caseContacts.map((cc, i) => i === editingContactIndex ? { ...cc, person: updated } : cc))
            setEditingContactIndex(null)
        } finally {
            setUpdating(false)
        }
    }

    const handlePostalCodeChange = async (value: string) => {
        setNewPerson(prev => ({ ...prev, postalCode: value }))
        const cleaned = value.replace(/[^\d]/g, "")
        if (cleaned.length === 7) {
            setSearching(true)
            const address = await fetchAddressFromPostalCode(cleaned)
            if (address) {
                setNewPerson(prev => withPostalCodeLookupAddress({ ...prev, postalCode: value }, address))
            }
            setSearching(false)
        }
    }

    const handleEditPostalCodeChange = async (value: string) => {
        setEditPerson(prev => ({ ...prev, postalCode: value }))
        const cleaned = value.replace(/[^\d]/g, "")
        if (cleaned.length === 7) {
            setEditSearching(true)
            const address = await fetchAddressFromPostalCode(cleaned)
            if (address) {
                setEditPerson(prev => withPostalCodeLookupAddress({ ...prev, postalCode: value }, address))
            }
            setEditSearching(false)
        }
    }

    const handleRemove = (index: number) => {
        if (!confirm("この連絡先を案件から外しますか？（人物マスタからは削除されません）")) return
        onChange(caseContacts.filter((_, i) => i !== index))
    }

    const handleMemoChange = (index: number, memo: string) => {
        const updated = [...caseContacts]
        updated[index] = { ...updated[index], memo }
        onChange(updated)
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => { setShowAddModal(true); setShowCreateForm(false); setSearchQuery("") }}>
                    <Plus className="h-3.5 w-3.5 mr-1" />連絡先を追加
                </Button>
            </div>

            {caseContacts.map((cc, index) => (
                <div key={cc.personId} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-medium">{cc.person.name}</div>
                                    {cc.person.nameKana && (
                                        <div className="truncate text-xs text-muted-foreground">{cc.person.nameKana}</div>
                                    )}
                                </div>
                                {cc.person.phone && <span className="text-xs text-muted-foreground">{cc.person.phone}</span>}
                            </div>
                            {(cc.person.postalCode || getDisplayAddress(cc.person)) && (
                                <p className="text-xs text-muted-foreground truncate">
                                    {cc.person.postalCode && `〒${cc.person.postalCode} `}{getDisplayAddress(cc.person)}
                                </p>
                            )}
                            {cc.person.memo && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{cc.person.memo}</p>
                            )}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                            <button
                                type="button"
                                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                onClick={() => openEditModal(index)}
                                title="連絡先を編集"
                            >
                                <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                                type="button"
                                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                onClick={() => handleRemove(index)}
                                title="この連絡先を外す"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                    <div className="mt-2">
                        <Input
                            value={cc.memo}
                            onChange={(e) => handleMemoChange(index, e.target.value)}
                            placeholder="案件固有のメモ"
                            className="h-8 text-xs"
                        />
                    </div>
                </div>
            ))}

            {caseContacts.length === 0 && (
                <EmptyState
                    icon={UserPlus}
                    title="連絡先が登録されていません"
                    description="「連絡先を追加」ボタンで人物マスタから追加できます"
                    action={{ label: "+ 追加", onClick: () => setShowAddModal(true) }}
                />
            )}

            <Modal isOpen={editingContactIndex != null} onClose={() => setEditingContactIndex(null)} title="連絡先を編集">
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
                                <Label>電話番号</Label>
                                <Input value={editPerson.phone} onChange={e => setEditPerson(p => ({ ...p, phone: e.target.value }))} placeholder="090-0000-0000" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[150px_1fr]">
                            <div className="space-y-1.5">
                                <Label>郵便番号</Label>
                                <div className="flex gap-1">
                                    <Input value={editPerson.postalCode} onChange={e => handleEditPostalCodeChange(e.target.value)} placeholder="000-0000" className="flex-1" />
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

                    {editingContactIndex != null && (
                        <div className="space-y-1.5 border-t pt-4">
                            <Label>この案件でのメモ</Label>
                            <Input
                                value={caseContacts[editingContactIndex]?.memo || ""}
                                onChange={(e) => handleMemoChange(editingContactIndex, e.target.value)}
                                placeholder="案件固有のメモ"
                            />
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => setEditingContactIndex(null)} disabled={updating}>キャンセル</Button>
                        <Button onClick={handleUpdatePerson} disabled={!editPerson.name.trim() || updating}>
                            {updating ? "保存中..." : "保存"}
                        </Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="連絡先を追加">
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
                                <Label>電話番号</Label>
                                <Input value={newPerson.phone} onChange={e => setNewPerson(p => ({ ...p, phone: e.target.value }))} placeholder="090-0000-0000" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[150px_1fr]">
                            <div className="space-y-1.5">
                                <Label>郵便番号</Label>
                                <div className="flex gap-1">
                                    <Input value={newPerson.postalCode} onChange={e => handlePostalCodeChange(e.target.value)} placeholder="000-0000" className="flex-1" />
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
                            <Input ref={searchInputRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="氏名・フリガナ・電話番号・住所で検索" className="flex-1" />
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
