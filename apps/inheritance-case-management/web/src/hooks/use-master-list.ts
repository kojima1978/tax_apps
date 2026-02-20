"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/components/ui/Toast"

type SortOrder = "asc" | "desc"

export interface MasterListConfig<T extends { id: string; active: boolean }, C, U> {
    fetchAll: () => Promise<T[]>
    create: (data: C) => Promise<T>
    update: (id: string, data: U) => Promise<T>
    remove: (id: string) => Promise<void>
    getCreatePayload: (item: T) => C
    getUpdatePayload: (item: T) => U
    entityLabel: string
    savedParam: string
    sortFields: string[]
    getSortValue: (item: T, field: string) => string
    getDeleteLabel: (item: T) => string
}

export function useMasterList<T extends { id: string; active: boolean }, C, U>(
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
    const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())

    const [sortField, setSortField] = useState<string | null>(null)
    const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
    const [showInactive, setShowInactive] = useState(true)

    const [editingId, setEditingId] = useState<string | null>(null)
    const [editingFields, setEditingFields] = useState<Record<string, string>>({})

    const [isSaving, setIsSaving] = useState(false)
    const [isDirty, setIsDirty] = useState(false)

    useEffect(() => {
        const load = async () => {
            try {
                const data = await configRef.current.fetchAll()
                setOriginalItems(data)
                setItems(data)
            } catch (e) {
                console.error(e)
            }
        }
        load()
    }, [])

    useEffect(() => {
        const isModified = JSON.stringify(originalItems) !== JSON.stringify(items) || deletedIds.size > 0
        setIsDirty(isModified)

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isModified) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [items, originalItems, deletedIds])

    const handleSave = useCallback(async () => {
        setIsSaving(true)
        try {
            const cfg = configRef.current
            const promises: Promise<unknown>[] = []

            for (const id of deletedIds) {
                if (!id.startsWith("temp_")) {
                    promises.push(cfg.remove(id))
                }
            }

            for (const item of items) {
                if (item.id.startsWith("temp_")) {
                    promises.push(cfg.create(cfg.getCreatePayload(item)))
                } else {
                    const original = originalItems.find(o => o.id === item.id)
                    if (original && JSON.stringify(original) !== JSON.stringify(item)) {
                        promises.push(cfg.update(item.id, cfg.getUpdatePayload(item)))
                    }
                }
            }

            await Promise.all(promises)

            const newData = await cfg.fetchAll()
            setOriginalItems(newData)
            setItems(newData)
            setDeletedIds(new Set())
            setIsDirty(false)

            router.refresh()
            if (returnTo) {
                router.push(`${returnTo}?saved=${cfg.savedParam}`)
            } else {
                toast.success("変更を保存しました")
            }
        } catch (e) {
            console.error(e)
            toast.error("保存中にエラーが発生しました")
        } finally {
            setIsSaving(false)
        }
    }, [deletedIds, items, originalItems, returnTo, router, toast])

    const handleAdd = useCallback((newItem: T) => {
        setItems(prev => [...prev, newItem])
    }, [])

    const handleToggleActive = useCallback((id: string) => {
        setItems(prev => prev.map(item =>
            item.id === id ? { ...item, active: !item.active } : item
        ))
    }, [])

    const handlePermanentDelete = useCallback((id: string) => {
        const item = items.find(i => i.id === id)
        if (!item) return

        if (!id.startsWith("temp_") && item.active !== false) {
            toast.warning("完全削除するには、まず無効化してください。")
            return
        }

        if (!confirm(`${configRef.current.getDeleteLabel(item)} を一覧から削除しますか？\n（保存ボタンを押すまで確定しません）`)) {
            return
        }

        setItems(prev => prev.filter(i => i.id !== id))
        if (!id.startsWith("temp_")) {
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
        if (!editingId || !validate()) return

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
        if (!sortField) return filtered

        const getSortValue = configRef.current.getSortValue
        return [...filtered].sort((a, b) => {
            const aValue = getSortValue(a, sortField)
            const bValue = getSortValue(b, sortField)
            const comparison = aValue.localeCompare(bValue, "ja")
            return sortOrder === "asc" ? comparison : -comparison
        })
    }, [items, sortField, sortOrder, showInactive])

    return {
        items,
        filteredAndSortedItems,
        isDirty,
        isSaving,
        showInactive,
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
