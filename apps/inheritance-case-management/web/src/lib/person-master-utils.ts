import { normalizePersonAddressParts } from "@/lib/person-address"
import { normalizeNameKanaForStorage } from "@/lib/person-search"

export interface PersonMasterFields {
    name?: string | null
    nameKana?: string | null
    phone?: string | null
    postalCode?: string | null
    address?: string | null
    addressFromPostalCode?: string | null
    addressManual?: string | null
    memo?: string | null
}

export interface PersonMasterPayload {
    name: string
    nameKana: string
    phone: string
    postalCode: string
    address: string
    addressFromPostalCode: string
    addressManual: string
    memo: string
}

export function createPersonMasterDraft({
    name,
    nameKana,
    phone,
}: {
    name: string
    nameKana: string
    phone: string
}): PersonMasterPayload {
    return {
        name: name.trim(),
        nameKana: normalizeNameKanaForStorage(nameKana),
        phone: phone.trim(),
        postalCode: "",
        address: "",
        addressFromPostalCode: "",
        addressManual: "",
        memo: "",
    }
}

export function getPersonMasterEditingFields(
    item: PersonMasterFields,
    extraFields: Record<string, string | null | undefined> = {},
): Record<string, string> {
    const fields: Record<string, string> = {
        name: item.name || "",
        nameKana: item.nameKana || "",
        phone: item.phone || "",
        postalCode: item.postalCode || "",
        address: item.address || "",
        addressFromPostalCode: item.addressFromPostalCode || "",
        addressManual: item.addressManual || "",
        memo: item.memo || "",
    }

    for (const [key, value] of Object.entries(extraFields)) {
        fields[key] = value || ""
    }

    return fields
}

export function getPersonMasterPayload(fields: PersonMasterFields): PersonMasterPayload {
    const addressParts = normalizePersonAddressParts({
        address: fields.address,
        addressFromPostalCode: fields.addressFromPostalCode,
        addressManual: fields.addressManual,
    })

    return {
        name: fields.name?.trim() || "",
        nameKana: normalizeNameKanaForStorage(fields.nameKana || ""),
        phone: fields.phone?.trim() || "",
        postalCode: fields.postalCode?.trim() || "",
        ...addressParts,
        memo: fields.memo?.trim() || "",
    }
}
