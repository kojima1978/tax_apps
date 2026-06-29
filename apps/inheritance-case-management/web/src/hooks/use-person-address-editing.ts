"use client"

import { useCallback, useState, type Dispatch, type SetStateAction } from "react"
import { applyPostalCodeAddress, combinePersonAddress, normalizePersonAddressParts } from "@/lib/person-address"
import { fetchAddressFromPostalCode, fetchPostalCodeFromAddress } from "@/lib/postal-code"
import { normalizePostalCodeDigits } from "@/lib/postal-code-format"

type EditingFields = Record<string, string>
type SetEditingFields = Dispatch<SetStateAction<EditingFields>>

export function usePersonAddressEditing(setEditingFields: SetEditingFields) {
    const [isAddressSearching, setIsAddressSearching] = useState(false)
    const [isPostalSearching, setIsPostalSearching] = useState(false)

    const updateAddressFromPostalCode = useCallback((addressFromPostalCode: string) => {
        setEditingFields(fields => ({
            ...fields,
            addressFromPostalCode,
            address: normalizePersonAddressParts({ ...fields, addressFromPostalCode }).address,
        }))
    }, [setEditingFields])

    const updateAddressManual = useCallback((addressManual: string) => {
        setEditingFields(fields => ({
            ...fields,
            addressManual,
            address: normalizePersonAddressParts({ ...fields, addressManual }).address,
        }))
    }, [setEditingFields])

    const searchAddressByPostalCode = useCallback(async (postalCode: string) => {
        const digits = normalizePostalCodeDigits(postalCode)
        if (digits.length !== 7) return

        setIsAddressSearching(true)
        try {
            const address = await fetchAddressFromPostalCode(digits)
            if (address) {
                setEditingFields(fields => ({
                    ...fields,
                    postalCode: digits,
                    ...applyPostalCodeAddress(fields, address),
                }))
            }
        } finally {
            setIsAddressSearching(false)
        }
    }, [setEditingFields])

    const handlePostalCodeChange = useCallback(async (value: string) => {
        const digits = normalizePostalCodeDigits(value)
        setEditingFields(fields => ({ ...fields, postalCode: digits }))
        await searchAddressByPostalCode(digits)
    }, [searchAddressByPostalCode, setEditingFields])

    const searchPostalCodeByAddress = useCallback(async (fields: EditingFields) => {
        const address = combinePersonAddress(fields.addressFromPostalCode, fields.addressManual) || (fields.address ?? "")
        if (!address.trim()) return

        setIsPostalSearching(true)
        try {
            const postalCode = await fetchPostalCodeFromAddress(address)
            if (postalCode) {
                setEditingFields(prev => ({ ...prev, postalCode }))
            }
        } finally {
            setIsPostalSearching(false)
        }
    }, [setEditingFields])

    return {
        isAddressSearching,
        isPostalSearching,
        handlePostalCodeChange,
        searchAddressByPostalCode,
        searchPostalCodeByAddress,
        updateAddressFromPostalCode,
        updateAddressManual,
    }
}
