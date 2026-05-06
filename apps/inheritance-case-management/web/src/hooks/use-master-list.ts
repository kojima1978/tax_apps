"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/components/ui/Toast"

type SortOrder = "asc" | "desc"
type MasterListItem = { id: number; active: boolean }

export interface MasterListConfig<T extends MasterListItem, C, U> {
    fetchAll: () => Promise<T[]>
    create: (data: C) => Promise<T>
    update: (id: number, data: U) => Promise<T>
    remove: (id: number) => Promise<void>
    getCreatePayload: (item: T) => C
    getUpdatePayload: (item: T) => U
    entityLabel: string
    savedParam: string
    sortFields: string[]
    defaultSortField?: string
    getSortValue: (item: T, field: string) => string
    matchesSearch?: (item: T, query: string) => boolean
    getDeleteLabel: (item: T) => string
    getPermanentDeleteBlockMessage?: (item: T) => string | null
}

function serializeItem(item: unknown): string {
    return JSON.stringify(item)
}

function hasUnsavedChanges<T extends MasterListItem>(
    originalItems: T[],
    items: T[],
    deletedIds: Set<number>,
): boolean {
    return deletedIds.size > 0 || serializeItem(originalItems) !== serializeItem(items)
}

function indexItemsById<T extends MasterListItem>(items: T[]): Map<number, T> {
    return new Map(items.map(item => [item.id, item]))
}

function collectSaveOperations<T extends MasterListItem, C, U>({
    config,
    deletedIds,
    items,
    originalItems,
}: {
    config: MasterListConfig<T, C, U>
    deletedIds: Set<number>
    items: T[]
    originalItems: T[]
}): Promise<unknown>[] {
    const originalById = indexItemsById(originalItems)
    const operations: Promise<unknown>[] = []

    for (const id of deletedIds) {
        if (!isTempId(id)) {
            operations.push(config.remove(id))
        }
    }

    for (const item of items) {
        if (isTempId(item.id)) {
            operations.push(config.create(config.getCreatePayload(item)))
            continue
        }

        const original = originalById.get(item.id)
        if (original && serializeItem(original) !== serializeItem(item)) {
            operations.push(config.update(item.id, config.getUpdatePayload(item)))
        }
    }

    return operations
}

// Counter for temporary IDs (negative numbers indicate unsaved items)
let tempIdCounter = 0;
export function nextTempId(): number {
    return --tempIdCounter;
}
export function isTempId(id: number): boolean {
    return id < 0;
}

export function useMasterList<T extends MasterListItem, C, U>(
    config: MasterListConfig<T, C, U>
) {
    const router = useRouter()
    const toast = useToast()
    const searchParams = useSearchParams()
    const returnTo = searchParams.get("returnTo")

    const configRef = useRef(config)
    configRef.current = config

    const [originalItems, setOriginalItems] = useState<T[]>([])
    const [items, setItems] = useState<T[]>([])
    const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set())

    const [sortField, setSortField] = useState<string | null>(config.defaultSortField ?? null)
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
    const [showInactive, setShowInactive] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    const [editingId, setEditingId] = useState<number | null>(null)
    const [editingFields, setEditingFields] = useState<Record<string, string>>({})

    const [isSaving, setIsSaving] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const isDirty = useMemo(
        () => hasUnsavedChanges(originalItems, items, deletedIds),
        [deletedIds, items, originalItems],
    )

    useEffect(() => {
        const load = async () => {
            try {
                const data = await configRef.current.fetchAll()
                setOriginalItems(data)
                setItems(data)
            } catch (e) {
                console.error(e)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [])

    useEffect(() => {
        if (!isDirty) return

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault()
            e.returnValue = ''
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [isDirty])

    const handleSave = useCallback(async () => {
        setIsSaving(true)
        try {
            const cfg = configRef.current
            await Promise.all(collectSaveOperations({ config: cfg, deletedIds, items, originalItems }))

            const newData = await cfg.fetchAll()
            setOriginalItems(newData)
            setItems(newData)
            setDeletedIds(new Set())

            router.refresh()
            if (returnTo) {
                router.push(`${returnTo}?saved=${cfg.savedParam}`)
            } else {
                toast.success("変更を保存しました")
            }
        } catch (e) {
            console.error(e)
            toast.error(e instanceof Error && e.message ? e.message : "保存中にエラーが発生しました")
        } finally {
            setIsSaving(false)
        }
    }, [deletedIds, items, originalItems, returnTo, router, toast])

    const handleAdd = useCallback((newItem: T) => {
        setItems(prev => [...prev, newItem])
    }, [])

    const handleToggleActive = useCallback((id: number) => {
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, active: !item.active } : item
        ))
    }, [])

    const handlePermanentDelete = useCallback((id: number) => {
        const item = items.find(i => i.id === id)
        if (!item) return

        if (!isTempId(id) && item.active !== false) {
            toast.warning("完全削除するには、まず無効化してください。")
            return
        }

        const blockMessage = configRef.current.getPermanentDeleteBlockMessage?.(item)
        if (blockMessage) {
            toast.warning(blockMessage)
            return
        }

        if (!confirm(`${configRef.current.getDeleteLabel(item)} を一覧から削除しますか？\n（保存ボタンを押すまで確定しません）`)) {
            return
        }

        setItems(prev => prev.filter(i => i.id !== id))
        if (!isTempId(id)) {
            setDeletedIds(prev => {
                const next = new Set(prev)
                next.add(id)
                return next
            })
        }
    }, [items, toast])

    const handleStartEdit = useCallback((item: T, fields: Record<string, string>) => {
        setEditingId(item.id)
        setEditingFields(fields)
    }, [])

    const handleSaveEdit = useCallback((validate: () => boolean, applyEdit: (item: T) => T) => {
        if (editingId === null || !validate()) return

        setItems(prev => prev.map(item =>
            item.id === editingId ? applyEdit(item) : item
        ))
        setEditingId(null)
        setEditingFields({})
    }, [editingId])

    const handleCancelEdit = useCallback(() => {
        setEditingId(null)
        setEditingFields({})
    }, [])

    const handleToggleShowInactive = useCallback(() => {
        setShowInactive(prev => !prev)
    }, [])

    const handleSearchChange = useCallback((value: string) => {
        setSearchQuery(value)
    }, [])

    const handleSort = useCallback((field: string) => {
        setSortField(prev => {
            if (prev === field) {
                setSortOrder(o => o === "asc" ? "desc" : "asc")
                return prev
            }
            setSortOrder("asc")
            return field
        })
    }, [])

    const filteredAndSortedItems = useMemo(() => {
        let filtered = items
        if (!showInactive) {
            filtered = items.filter(item => item.active !== false)
        }
        const trimmedQuery = searchQuery.trim()
        const matchesSearch = configRef.current.matchesSearch
        if (trimmedQuery && matchesSearch) {
            filtered = filtered.filter(item => matchesSearch(item, trimmedQuery))
        }
        if (!sortField) return filtered

        const getSortValue = configRef.current.getSortValue
        return [...filtered].sort((a, b) => {
            const aValue = getSortValue(a, sortField)
            const bValue = getSortValue(b, sortField)
            const comparison = aValue.localeCompare(bValue, "ja")
            return sortOrder === "asc" ? comparison : -comparison
        })
    }, [items, searchQuery, sortField, sortOrder, showInactive])

    /** 指定IDのアイテムを一括更新する（会社名一括変更等） */
    const updateItems = useCallback((updater: (items: T[]) => T[]) => {
        setItems(updater)
    }, [])

    return {
        items,
        filteredAndSortedItems,
        updateItems,
        isDirty,
        isSaving,
        isLoading,
        searchQuery,
        showInactive,
        handleSearchChange,
        handleToggleShowInactive,
        editingId,
        editingFields,
        setEditingFields,
        returnTo,
        handleSave,
        handleAdd,
        handleToggleActive,
        handlePermanentDelete,
        handleStartEdit,
        handleSaveEdit,
        handleCancelEdit,
        handleSort,
    }
}
