import type { CaseHeir, HeirPerson } from "@/types/shared"
import type { CreateHeirPersonInput } from "@/types/validation"
import { HEIR_RELATIONSHIP_LABELS, relationshipSortFor } from "@/lib/constants/heir-relationships"
import { applyPostalCodeAddress, normalizePersonAddressParts } from "@/lib/person-address"
import { normalizeNameKanaForStorage, personMatchesSearch } from "@/lib/person-search"

export interface HeirPersonFormState {
    name: string
    nameKana: string
    dateOfBirth: string
    phone: string
    postalCode: string
    address: string
    addressFromPostalCode: string
    addressManual: string
    memo: string
}

export const emptyHeirPersonForm: HeirPersonFormState = {
    name: "",
    nameKana: "",
    dateOfBirth: "",
    phone: "",
    postalCode: "",
    address: "",
    addressFromPostalCode: "",
    addressManual: "",
    memo: "",
}

type PersonAddressInput = Parameters<typeof normalizePersonAddressParts>[0]

export function getDisplayAddress(parts: PersonAddressInput): string {
    return normalizePersonAddressParts(parts).address
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
        name: person.name.trim(),
        nameKana: normalizeNameKanaForStorage(person.nameKana),
        dateOfBirth: person.dateOfBirth || null,
        phone: person.phone,
        postalCode: person.postalCode,
        memo: person.memo,
        ...normalizePersonAddressParts(person),
    }
}

export function withAddressFromPostalCode<T extends HeirPersonFormState>(person: T, addressFromPostalCode: string): T {
    return { ...person, ...normalizePersonAddressParts({ ...person, addressFromPostalCode }) }
}

export function withPostalCodeLookupAddress<T extends HeirPersonFormState>(person: T, addressFromPostalCode: string): T {
    return { ...person, ...applyPostalCodeAddress(person, addressFromPostalCode) }
}

export function withAddressManual<T extends HeirPersonFormState>(person: T, addressManual: string): T {
    return { ...person, ...normalizePersonAddressParts({ ...person, addressManual }) }
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

export function sortHeirsByRelationship(heirs: CaseHeir[]): CaseHeir[] {
    return [...heirs]
        .sort((a, b) => relationshipSortFor(a.relationship || "") - relationshipSortFor(b.relationship || ""))
        .map((heir, index) => ({
            ...heir,
            sortOrder: index,
            relationshipSortOrder: relationshipSortFor(heir.relationship || ""),
        }))
}

export { HEIR_RELATIONSHIP_LABELS }
