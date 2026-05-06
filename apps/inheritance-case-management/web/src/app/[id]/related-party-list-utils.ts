import type { CaseRelatedParty, RelatedPartyPerson } from "@/types/shared"
import type { CreateRelatedPartyPersonInput } from "@/types/validation"
import { normalizePersonAddressParts } from "@/lib/person-address"
import { personMatchesSearch } from "@/lib/person-search"
import {
    type BasePersonFormState,
    emptyBasePersonForm,
    getBasePersonPayload,
} from "./case-person-utils"

export interface RelatedPartyPersonFormState extends BasePersonFormState {
    profession: string
}

export const emptyRelatedPartyPersonForm: RelatedPartyPersonFormState = {
    ...emptyBasePersonForm,
    profession: "",
}

export function getRelatedPartyPersonFormState(person: RelatedPartyPerson): RelatedPartyPersonFormState {
    return {
        name: person.name,
        nameKana: person.nameKana || "",
        profession: person.profession || "",
        phone: person.phone || "",
        postalCode: person.postalCode || "",
        ...normalizePersonAddressParts(person),
        memo: person.memo || "",
    }
}

export function getRelatedPartyPersonPayload(person: RelatedPartyPersonFormState): CreateRelatedPartyPersonInput {
    return {
        ...getBasePersonPayload(person),
        profession: person.profession,
    }
}

export function createCaseRelatedParty(person: RelatedPartyPerson, sortOrder: number): CaseRelatedParty {
    return {
        id: 0,
        sortOrder,
        personId: person.id,
        person,
        memo: "",
    }
}

export function getAvailableRelatedPartyPersons(persons: RelatedPartyPerson[], searchQuery: string): RelatedPartyPerson[] {
    return persons
        .filter(p => p.active)
        .filter(p => personMatchesSearch(p, searchQuery))
}

export function updateRelatedPartyMemo(parties: CaseRelatedParty[], index: number, memo: string): CaseRelatedParty[] {
    return parties.map((party, i) => i === index ? { ...party, memo } : party)
}
