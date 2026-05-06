import { applyPostalCodeAddress, normalizePersonAddressParts } from "@/lib/person-address"
import { normalizeNameKanaForStorage } from "@/lib/person-search"

export interface BasePersonFormState {
    name: string
    nameKana: string
    phone: string
    postalCode: string
    address: string
    addressFromPostalCode: string
    addressManual: string
    memo: string
}

export const emptyBasePersonForm: BasePersonFormState = {
    name: "",
    nameKana: "",
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

export function getBasePersonPayload(person: BasePersonFormState) {
    return {
        name: person.name.trim(),
        nameKana: normalizeNameKanaForStorage(person.nameKana),
        phone: person.phone,
        postalCode: person.postalCode,
        memo: person.memo,
        ...normalizePersonAddressParts(person),
    }
}

export function withAddressFromPostalCode<T extends BasePersonFormState>(person: T, addressFromPostalCode: string): T {
    return { ...person, ...normalizePersonAddressParts({ ...person, addressFromPostalCode }) }
}

export function withPostalCodeLookupAddress<T extends BasePersonFormState>(person: T, addressFromPostalCode: string): T {
    return { ...person, ...applyPostalCodeAddress(person, addressFromPostalCode) }
}

export function withAddressManual<T extends BasePersonFormState>(person: T, addressManual: string): T {
    return { ...person, ...normalizePersonAddressParts({ ...person, addressManual }) }
}
