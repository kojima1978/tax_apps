"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/ui/EmptyState"
import { UserPlus, Plus } from "lucide-react"
import type { CaseRelatedParty, RelatedPartyPerson } from "@/types/shared"
import { createRelatedPartyPerson, updateRelatedPartyPerson } from "@/lib/api/related-party-persons"
import { fetchAddressFromPostalCode } from "@/lib/postal-code"
import { normalizePostalCodeDigits } from "@/lib/postal-code-format"
import { withPostalCodeLookupAddress } from "./case-person-utils"
import { RelatedPartyAddModal } from "./RelatedPartyAddModal"
import { RelatedPartyCard } from "./RelatedPartyCard"
import { RelatedPartyPersonEditModal } from "./RelatedPartyPersonEditModal"
import {
    createCaseRelatedParty,
    emptyRelatedPartyPersonForm,
    getAvailableRelatedPartyPersons,
    getRelatedPartyPersonFormState,
    getRelatedPartyPersonPayload,
    updateRelatedPartyMemo,
} from "./related-party-list-utils"

interface RelatedPartyListEditorProps {
    parties: CaseRelatedParty[]
    persons: RelatedPartyPerson[]
    onChange: (parties: CaseRelatedParty[]) => void
    onPersonsChange: (persons: RelatedPartyPerson[]) => void
}

export function RelatedPartyListEditor({ parties, persons, onChange, onPersonsChange }: RelatedPartyListEditorProps) {
    const [showAddModal, setShowAddModal] = useState(false)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [newPerson, setNewPerson] = useState(emptyRelatedPartyPersonForm)
    const [editPerson, setEditPerson] = useState(emptyRelatedPartyPersonForm)
    const [creating, setCreating] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [searching, setSearching] = useState(false)
    const [editSearching, setEditSearching] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (showAddModal && searchInputRef.current) searchInputRef.current.focus()
    }, [showAddModal])

    const filteredPersons = useMemo(
        () => getAvailableRelatedPartyPersons(persons, searchQuery),
        [persons, searchQuery],
    )

    const handleAddPerson = (person: RelatedPartyPerson) => {
        onChange([...parties, createCaseRelatedParty(person, parties.length)])
        setShowAddModal(false)
        setSearchQuery("")
    }

    const openEditModal = (index: number) => {
        setEditingIndex(index)
        setEditPerson(getRelatedPartyPersonFormState(parties[index].person))
    }

    const handleCreateAndAdd = async () => {
        if (!newPerson.name.trim()) return
        setCreating(true)
        try {
            const created = await createRelatedPartyPerson(getRelatedPartyPersonPayload(newPerson))
            onPersonsChange([...persons, created])
            handleAddPerson(created)
            setNewPerson(emptyRelatedPartyPersonForm)
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
            const updated = await updateRelatedPartyPerson(party.personId, getRelatedPartyPersonPayload(editPerson))
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

    const searchPostalCodeForNewPerson = async () => {
        setSearching(true)
        const address = await fetchAddressFromPostalCode(newPerson.postalCode)
        if (address) setNewPerson(prev => withPostalCodeLookupAddress(prev, address))
        setSearching(false)
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

    const searchPostalCodeForEditPerson = async () => {
        setEditSearching(true)
        const address = await fetchAddressFromPostalCode(editPerson.postalCode)
        if (address) setEditPerson(prev => withPostalCodeLookupAddress(prev, address))
        setEditSearching(false)
    }

    const handleRemove = (index: number) => {
        if (!confirm("この関係者を案件から外しますか？（人物マスタからは削除されません）")) return
        onChange(parties.filter((_, i) => i !== index))
    }

    const handleMemoChange = (index: number, memo: string) => {
        onChange(updateRelatedPartyMemo(parties, index, memo))
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => { setShowAddModal(true); setShowCreateForm(false); setSearchQuery("") }}>
                    <Plus className="h-3.5 w-3.5 mr-1" />関係者を追加
                </Button>
            </div>

            {parties.map((party, index) => (
                <RelatedPartyCard
                    key={`${party.personId}-${index}`}
                    party={party}
                    index={index}
                    onEdit={openEditModal}
                    onRemove={handleRemove}
                    onMemoChange={handleMemoChange}
                />
            ))}

            {parties.length === 0 && (
                <EmptyState
                    icon={UserPlus}
                    title="関係者が登録されていません"
                    description="税理士・司法書士・不動産業者など、案件に関わる外部の関係者を登録できます"
                    action={{ label: "+ 追加", onClick: () => setShowAddModal(true) }}
                />
            )}

            <RelatedPartyPersonEditModal
                isOpen={editingIndex != null}
                person={editPerson}
                isUpdating={updating}
                isSearching={editSearching}
                onClose={() => setEditingIndex(null)}
                onPersonChange={setEditPerson}
                onPostalCodeChange={handleEditPostalCodeChange}
                onSearchPostalCode={searchPostalCodeForEditPerson}
                onSave={handleUpdatePerson}
            />

            <RelatedPartyAddModal
                isOpen={showAddModal}
                showCreateForm={showCreateForm}
                searchInputRef={searchInputRef}
                searchQuery={searchQuery}
                filteredPersons={filteredPersons}
                newPerson={newPerson}
                isCreating={creating}
                isSearching={searching}
                onClose={() => setShowAddModal(false)}
                onSearchQueryChange={setSearchQuery}
                onShowCreateFormChange={setShowCreateForm}
                onNewPersonChange={setNewPerson}
                onAddPerson={handleAddPerson}
                onCreateAndAdd={handleCreateAndAdd}
                onPostalCodeChange={handlePostalCodeChange}
                onSearchPostalCode={searchPostalCodeForNewPerson}
            />
        </div>
    )
}
