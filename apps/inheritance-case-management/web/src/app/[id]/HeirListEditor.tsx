"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/Button"
import { EmptyState } from "@/components/ui/EmptyState"
import { UserPlus, Plus, ArrowDownAZ, Download } from "lucide-react"
import type { CaseHeir, HeirPerson } from "@/types/shared"
import { createHeirPerson, updateHeirPerson } from "@/lib/api/heir-persons"
import { exportCaseHeirsToCSV } from "@/lib/export-csv"
import { fetchAddressFromPostalCode } from "@/lib/postal-code"
import { normalizePostalCodeDigits } from "@/lib/postal-code-format"
import { HeirAddModal } from "./HeirAddModal"
import { HeirCard } from "./HeirCard"
import { HeirPersonEditModal } from "./HeirPersonEditModal"
import {
    createCaseHeir,
    emptyHeirPersonForm,
    getAvailableHeirPersons,
    getHeirPersonFormState,
    getHeirPersonPayload,
    sortHeirsByDateOfBirth,
    updateHeirMemo,
    updateHeirRelationship,
} from "./heir-list-utils"
import { withPostalCodeLookupAddress } from "./case-person-utils"

interface HeirListEditorProps {
    heirs: CaseHeir[]
    persons: HeirPerson[]
    dateOfDeath?: string
    deceasedName?: string
    onChange: (heirs: CaseHeir[]) => void
    onPersonsChange: (persons: HeirPerson[]) => void
}

export function HeirListEditor({ heirs, persons, dateOfDeath, deceasedName, onChange, onPersonsChange }: HeirListEditorProps) {
    const [showAddModal, setShowAddModal] = useState(false)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [editingIndex, setEditingIndex] = useState<number | null>(null)
    const [searchQuery, setSearchQuery] = useState("")
    const [newPerson, setNewPerson] = useState(emptyHeirPersonForm)
    const [editPerson, setEditPerson] = useState(emptyHeirPersonForm)
    const [creating, setCreating] = useState(false)
    const [updating, setUpdating] = useState(false)
    const [searching, setSearching] = useState(false)
    const [editSearching, setEditSearching] = useState(false)
    const searchInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (showAddModal && searchInputRef.current) searchInputRef.current.focus()
    }, [showAddModal])

    const filteredPersons = useMemo(
        () => getAvailableHeirPersons(persons, heirs, searchQuery),
        [persons, heirs, searchQuery],
    )

    const handleAddPerson = (person: HeirPerson) => {
        onChange([...heirs, createCaseHeir(person, heirs.length)])
        setShowAddModal(false)
        setSearchQuery("")
    }

    const openEditModal = (index: number) => {
        setEditingIndex(index)
        setEditPerson(getHeirPersonFormState(heirs[index].person))
    }

    const handleCreateAndAdd = async () => {
        if (!newPerson.name.trim()) return
        setCreating(true)
        try {
            const created = await createHeirPerson(getHeirPersonPayload(newPerson))
            onPersonsChange([...persons, created])
            handleAddPerson(created)
            setNewPerson(emptyHeirPersonForm)
            setShowCreateForm(false)
        } catch {
            // error handled by caller
        } finally {
            setCreating(false)
        }
    }

    const handleUpdatePerson = async () => {
        if (editingIndex == null || !editPerson.name.trim()) return
        const heir = heirs[editingIndex]
        setUpdating(true)
        try {
            const updated = await updateHeirPerson(heir.personId, getHeirPersonPayload(editPerson))
            onPersonsChange(persons.map(p => p.id === updated.id ? updated : p))
            onChange(heirs.map((h, i) => i === editingIndex ? { ...h, person: updated } : h))
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
        if (!confirm("この相続人を案件から外しますか？（人物マスタからは削除されません）")) return
        onChange(heirs.filter((_, i) => i !== index))
    }

    const handleMemoChange = (index: number, memo: string) => {
        onChange(updateHeirMemo(heirs, index, memo))
    }

    const handleRelationshipChange = (index: number, relationship: string) => {
        onChange(updateHeirRelationship(heirs, index, relationship))
    }

    const handleResortByDateOfBirth = () => {
        onChange(sortHeirsByDateOfBirth(heirs))
    }

    const handleExportCsv = () => {
        exportCaseHeirsToCSV(heirs, deceasedName ?? "", dateOfDeath)
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-end gap-2">
                {heirs.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={handleResortByDateOfBirth} title="生年月日順に並びなおします">
                        <ArrowDownAZ className="h-3.5 w-3.5 mr-1" />生年月日順に並びなおす
                    </Button>
                )}
                {heirs.length > 0 && (
                    <Button type="button" variant="ghost" size="sm" onClick={handleExportCsv} title="この案件の相続人をCSV出力">
                        <Download className="h-3.5 w-3.5 mr-1" />CSV出力
                    </Button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => { setShowAddModal(true); setShowCreateForm(false); setSearchQuery("") }}>
                    <Plus className="h-3.5 w-3.5 mr-1" />相続人を追加
                </Button>
            </div>

            {heirs.map((heir, index) => (
                <HeirCard
                    key={heir.personId}
                    heir={heir}
                    index={index}
                    dateOfDeath={dateOfDeath}
                    onEdit={openEditModal}
                    onRemove={handleRemove}
                    onMemoChange={handleMemoChange}
                    onRelationshipChange={handleRelationshipChange}
                />
            ))}

            {heirs.length === 0 && (
                <EmptyState
                    icon={UserPlus}
                    title="相続人が登録されていません"
                    description="「相続人を追加」ボタンで人物マスタから追加できます"
                    action={{ label: "+ 追加", onClick: () => setShowAddModal(true) }}
                />
            )}

            <HeirPersonEditModal
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

            <HeirAddModal
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
