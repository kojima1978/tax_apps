import type { InheritanceCase } from "@/types/shared"

const STORAGE_KEY_PREFIX = "itcm:case-form-draft:v1"
const DRAFT_TTL_MS = 12 * 60 * 60 * 1000

interface StoredCaseFormDraft {
    caseId: number | "new"
    savedAt: number
    data: InheritanceCase
}

function getExpectedCaseId(initialData: InheritanceCase, isCreateMode: boolean): number | "new" {
    return isCreateMode ? "new" : initialData.id
}

function canUseSessionStorage(): boolean {
    return typeof window !== "undefined" && !!window.sessionStorage
}

export function getCaseFormDraftKey(initialData: InheritanceCase, isCreateMode: boolean): string {
    return `${STORAGE_KEY_PREFIX}:${getExpectedCaseId(initialData, isCreateMode)}`
}

export function saveCaseFormDraft(key: string, formData: InheritanceCase, isCreateMode: boolean): void {
    if (!canUseSessionStorage()) return

    const draft: StoredCaseFormDraft = {
        caseId: isCreateMode ? "new" : formData.id,
        savedAt: Date.now(),
        data: formData,
    }

    try {
        window.sessionStorage.setItem(key, JSON.stringify(draft))
    } catch (e) {
        console.warn("Failed to save case form draft", e)
    }
}

export function consumeCaseFormDraft(
    key: string,
    initialData: InheritanceCase,
    isCreateMode: boolean,
): InheritanceCase | null {
    if (!canUseSessionStorage()) return null

    const raw = window.sessionStorage.getItem(key)
    if (!raw) return null

    try {
        const draft = JSON.parse(raw) as StoredCaseFormDraft
        const expectedCaseId = getExpectedCaseId(initialData, isCreateMode)
        const isExpired = Date.now() - draft.savedAt > DRAFT_TTL_MS
        const isDifferentCase = draft.caseId !== expectedCaseId

        window.sessionStorage.removeItem(key)

        if (isExpired || isDifferentCase) {
            return null
        }

        return draft.data
    } catch (e) {
        console.warn("Failed to restore case form draft", e)
        window.sessionStorage.removeItem(key)
        return null
    }
}

export function discardCaseFormDraft(key: string): void {
    if (!canUseSessionStorage()) return
    window.sessionStorage.removeItem(key)
}
