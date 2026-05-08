import type { CaseHeir, HeirPerson } from "@/types/shared"
import type { CreateHeirPersonInput } from "@/types/validation"
import { HEIR_RELATIONSHIP_LABELS, relationshipSortFor } from "@/lib/constants/heir-relationships"
import { normalizePersonAddressParts } from "@/lib/person-address"
import { personMatchesSearch } from "@/lib/person-search"
import {
    type BasePersonFormState,
    emptyBasePersonForm,
    getBasePersonPayload,
} from "./case-person-utils"

export interface HeirPersonFormState extends BasePersonFormState {
    dateOfBirth: string
}

export const emptyHeirPersonForm: HeirPersonFormState = {
    ...emptyBasePersonForm,
    dateOfBirth: "",
}

export function getHeirPersonFormState(person: HeirPerson): HeirPersonFormState {
    return {
        name: person.name,
        nameKana: person.nameKana || "",
        dateOfBirth: person.dateOfBirth || "",
        phone: person.phone || "",
        postalCode: person.postalCode || "",
        ...normalizePersonAddressParts(person),
        memo: person.memo || "",
    }
}

export function getHeirPersonPayload(person: HeirPersonFormState): CreateHeirPersonInput {
    return {
        ...getBasePersonPayload(person),
        dateOfBirth: person.dateOfBirth || null,
    }
}

export function createCaseHeir(person: HeirPerson, sortOrder: number): CaseHeir {
    return {
        id: 0,
        sortOrder,
        personId: person.id,
        person,
        relationship: "",
        relationshipSortOrder: relationshipSortFor(""),
        memo: "",
    }
}

export function getAvailableHeirPersons(persons: HeirPerson[], heirs: CaseHeir[], searchQuery: string): HeirPerson[] {
    const linkedPersonIds = new Set(heirs.map(h => h.personId))
    return persons
        .filter(p => p.active && !linkedPersonIds.has(p.id))
        .filter(p => personMatchesSearch(p, searchQuery))
}

export function updateHeirMemo(heirs: CaseHeir[], index: number, memo: string): CaseHeir[] {
    return heirs.map((heir, i) => i === index ? { ...heir, memo } : heir)
}

export function updateHeirRelationship(heirs: CaseHeir[], index: number, relationship: string): CaseHeir[] {
    return heirs.map((heir, i) => i === index ? {
        ...heir,
        relationship,
        relationshipSortOrder: relationshipSortFor(relationship),
    } : heir)
}

export function sortHeirsByDateOfBirth(heirs: CaseHeir[]): CaseHeir[] {
    return [...heirs]
        .sort((a, b) => {
            const da = a.person.dateOfBirth
            const db = b.person.dateOfBirth
            if (!da && !db) return 0
            if (!da) return 1
            if (!db) return -1
            return da.localeCompare(db)
        })
        .map((heir, index) => ({ ...heir, sortOrder: index }))
}

export { HEIR_RELATIONSHIP_LABELS }
