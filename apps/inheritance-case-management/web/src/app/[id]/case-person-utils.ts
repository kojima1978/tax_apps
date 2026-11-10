import {
    applyPostalCodeAddress,
    migrateLegacyPersonAddress,
    normalizePersonAddressParts,
    withCombinedPersonAddress,
} from "@/lib/person-address"
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

// 保存済みの人物を表示するところ。旧データ（address だけ）も読めるように移行を通す。
export function getDisplayAddress(parts: PersonAddressInput): string {
    return migrateLegacyPersonAddress(parts).address
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

// 入力中は値をそのまま持ち、結合済みの address だけ作り直す（trim も旧データ移行もしない）。
export function withAddressFromPostalCode<T extends BasePersonFormState>(person: T, addressFromPostalCode: string): T {
    return withCombinedPersonAddress(person, { addressFromPostalCode })
}

export function withAddressManual<T extends BasePersonFormState>(person: T, addressManual: string): T {
    return withCombinedPersonAddress(person, { addressManual })
}

export function withPostalCodeLookupAddress<T extends BasePersonFormState>(person: T, addressFromPostalCode: string): T {
    return { ...person, ...applyPostalCodeAddress(person, addressFromPostalCode) }
}
