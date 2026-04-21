import { useState, useCallback } from "react"

type Errors<T> = Partial<Record<keyof T, string>>

export function useFormFields<T extends Record<string, string>>(initial: T) {
    const [values, setValues] = useState(initial)
    const [errors, setErrors] = useState<Errors<T>>({})

    const set = useCallback(<K extends keyof T>(field: K, value: string) => {
        setValues(prev => ({ ...prev, [field]: value }))
        setErrors(prev => prev[field] ? { ...prev, [field]: undefined } : prev)
    }, [])

    const setError = useCallback(<K extends keyof T>(field: K, message: string) => {
        setErrors(prev => ({ ...prev, [field]: message }))
    }, [])

    const reset = useCallback(() => {
        setValues(initial)
        setErrors({})
    }, [initial])

    const clearErrors = useCallback(() => setErrors({}), [])

    return { values, errors, set, setError, reset, clearErrors } as const
}
