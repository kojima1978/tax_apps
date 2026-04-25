"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { EmptyState } from "@/components/ui/EmptyState"
import { Modal } from "@/components/ui/Modal"
import { UserPlus, Search, Loader2, X, Plus } from "lucide-react"
import type { CaseContact, Person } from "@/types/shared"
import { createPerson } from "@/lib/api/persons"

interface ContactListEditorProps {
    caseContacts: CaseContact[]
    persons: Person[]
    onChange: (contacts: CaseContact[]) => void
    onPersonsChange: (persons: Person[]) => void
}

async function fetchAddress(postalCode: string): Promise<string | null> {
    const cleaned = postalCode.replace(/[^\d]/g, "")
    if (cleaned.length !== 7) return null
    try {
        const res = await fetch(`https://zipcloud.ibsnet.co.jp/api/search?zipcode=${cleaned}`)
        const data = await res.json()
        if (data.results && data.results.length > 0) {
            const r = data.results[0]
            return `${r.address1}${r.address2}${r.address3}`
        }
    } catch { /* ignore */ }
    return null
}

export function ContactListEditor({ caseContacts, persons, onChange, onPersonsChange }: ContactListEditorProps) {
    const [showAddModal, setShowAddModal] = useState(false)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [newPerson, setNewPerson] = useState({ name: "", phone: "", postalCode: "", address: "", memo: "" })
    const [creating, setCreating] = useState(false)
    const [searching, setSearching] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (showAddModal && searchInputRef.current) {
            searchInputRef.current.focus()
        }
    }, [showAddModal])

    const linkedPersonIds = new Set(caseContacts.map(c => c.personId))

    const filteredPersons = persons
        .filter(p => p.active && !linkedPersonIds.has(p.id))
        .filter(p => !searchQuery || p.name.includes(searchQuery) || p.phone.includes(searchQuery) || p.address.includes(searchQuery))

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

    const handleCreateAndAdd = async () => {
        if (!newPerson.name.trim()) return
        setCreating(true)
        try {
            const created = await createPerson(newPerson)
            onPersonsChange([...persons, created])
            handleAddPerson(created)
            setNewPerson({ name: "", phone: "", postalCode: "", address: "", memo: "" })
            setShowCreateForm(false)
        } catch {
            // error handled by caller
        } finally {
            setCreating(false)
        }
    }

    const handlePostalCodeChange = async (value: string) => {
        setNewPerson(prev => ({ ...prev, postalCode: value }))
        const cleaned = value.replace(/[^\d]/g, "")
        if (cleaned.length === 7) {
            setSearching(true)
            const address = await fetchAddress(cleaned)
            if (address) {
                setNewPerson(prev => ({ ...prev, postalCode: value, address }))
            }
            setSearching(false)
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
                                <span className="font-medium text-sm">{cc.person.name}</span>
                                {cc.person.phone && <span className="text-xs text-muted-foreground">{cc.person.phone}</span>}
                            </div>
                            {(cc.person.postalCode || cc.person.address) && (
                                <p className="text-xs text-muted-foreground truncate">
                                    {cc.person.postalCode && `〒${cc.person.postalCode} `}{cc.person.address}
                                </p>
                            )}
                            {cc.person.memo && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{cc.person.memo}</p>
                            )}
                        </div>
                        <button
                            type="button"
                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                            onClick={() => handleRemove(index)}
                            title="この連絡先を外す"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
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

            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="連絡先を追加">
                {showCreateForm ? (
                    <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>氏名 *</Label>
                                <Input value={newPerson.name} onChange={e => setNewPerson(p => ({ ...p, name: e.target.value }))} placeholder="氏名" autoFocus />
                            </div>
                            <div className="space-y-1.5">
                                <Label>電話番号</Label>
                                <Input value={newPerson.phone} onChange={e => setNewPerson(p => ({ ...p, phone: e.target.value }))} placeholder="090-0000-0000" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-3">
                            <div className="space-y-1.5">
                                <Label>郵便番号</Label>
                                <div className="flex gap-1">
                                    <Input value={newPerson.postalCode} onChange={e => handlePostalCodeChange(e.target.value)} placeholder="000-0000" className="flex-1" />
                                    <Button type="button" variant="ghost" size="sm" className="px-2 h-9 shrink-0" disabled={searching}
                                        onClick={async () => { setSearching(true); const a = await fetchAddress(newPerson.postalCode); if (a) setNewPerson(p => ({ ...p, address: a })); setSearching(false) }}>
                                        {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label>住所</Label>
                                <Input value={newPerson.address} onChange={e => setNewPerson(p => ({ ...p, address: e.target.value }))} placeholder="都道府県 市区町村 番地" />
                            </div>
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
                            <Input ref={searchInputRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="氏名・電話番号・住所で検索" className="flex-1" />
                            <Button variant="outline" size="sm" onClick={() => { setShowCreateForm(true); setNewPerson({ name: searchQuery, phone: "", postalCode: "", address: "", memo: "" }) }}>
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
                                            <span className="text-sm font-medium">{person.name}</span>
                                            {person.phone && <span className="text-xs text-muted-foreground">{person.phone}</span>}
                                        </div>
                                        {person.address && (
                                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{person.address}</p>
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
