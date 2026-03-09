import { useState, useCallback, useEffect } from "react"

interface UseKeyboardNavigationOptions {
    rowCount: number
    onEnter?: (index: number) => void
    onEscape?: () => void
    resetDeps?: unknown[]
}

export function useKeyboardNavigation({
    rowCount, onEnter, onEscape, resetDeps = [],
}: UseKeyboardNavigationOptions) {
    const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1)

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (rowCount === 0) return

            switch (e.key) {
                case "ArrowDown":
                case "j":
                    e.preventDefault()
                    setFocusedRowIndex((prev) => Math.min(prev + 1, rowCount - 1))
                    break
                case "ArrowUp":
                case "k":
                    e.preventDefault()
                    setFocusedRowIndex((prev) => Math.max(prev - 1, 0))
                    break
                case "Enter":
                    e.preventDefault()
                    if (focusedRowIndex >= 0 && focusedRowIndex < rowCount) {
                        onEnter?.(focusedRowIndex)
                    }
                    break
                case "Home":
                    e.preventDefault()
                    setFocusedRowIndex(0)
                    break
                case "End":
                    e.preventDefault()
                    setFocusedRowIndex(rowCount - 1)
                    break
                case "Escape":
                    e.preventDefault()
                    setFocusedRowIndex(-1)
                    onEscape?.()
                    break
            }
        },
        [rowCount, focusedRowIndex, onEnter, onEscape]
    )

    // Reset focused row when deps change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { setFocusedRowIndex(-1) }, resetDeps)

    const handleFocus = useCallback(() => {
        if (focusedRowIndex === -1 && rowCount > 0) {
            setFocusedRowIndex(0)
        }
    }, [focusedRowIndex, rowCount])

    return { focusedRowIndex, setFocusedRowIndex, handleKeyDown, handleFocus }
}
