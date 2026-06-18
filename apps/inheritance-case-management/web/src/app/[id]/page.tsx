"use client"

import { useEffect, useState, use, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import type { InheritanceCase } from "@/types/shared"
import { Button } from "@/components/ui/Button"
import Link from "next/link"
import { EditCaseForm } from "./edit-case-form"
import { getCase, deleteCase } from "@/lib/api/cases"
import { CASES_QUERY_KEY } from "@/hooks/use-cases"
import { useToast } from "@/components/ui/Toast"
import { Trash2, ChevronRight } from "lucide-react"
import { shouldCloseCaseDetailSections } from "@/lib/case-detail-section-state"

function EditCaseFormPanel({ caseItem }: { caseItem: InheritanceCase }) {
    const searchParams = useSearchParams()
    const sectionStateKey = shouldCloseCaseDetailSections(searchParams) ? "closed" : "default"

    return <EditCaseForm key={`${caseItem.id}-${sectionStateKey}`} initialData={caseItem} />
}

export default function InheritanceCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const queryClient = useQueryClient()
    const toast = useToast()
    const [caseItem, setCaseItem] = useState<InheritanceCase | undefined>(undefined)
    const [isLoading, setIsLoading] = useState(true)
    const [isDeleting, setIsDeleting] = useState(false)
    const [loadError, setLoadError] = useState<string | null>(null)

    useEffect(() => {
        const load = async () => {
            setLoadError(null)
            try {
                const item = await getCase(Number(id))
                if (item) {
                    setCaseItem(item)
                } else {
                    setCaseItem(undefined)
                }
            } catch (e) {
                const message = e instanceof Error ? e.message : "案件詳細の取得に失敗しました"
                setLoadError(message)
                setCaseItem(undefined)
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [id])

    const handleDelete = async () => {
        if (!confirm(`「${caseItem?.deceasedName}」の案件を削除してもよろしいですか？\nこの操作は取り消せません。`)) {
            return
        }

        setIsDeleting(true)
        try {
            await deleteCase(Number(id))
            queryClient.removeQueries({ queryKey: CASES_QUERY_KEY })
            toast.success("案件を削除しました")
            router.replace("/")
        } catch (e) {
            const message = e instanceof Error ? e.message : String(e)
            toast.error("削除に失敗しました: " + message)
        } finally {
            setIsDeleting(false)
        }
    }

    if (isLoading) {
        return <div className="p-10 text-center">読み込み中...</div>
    }

    if (!caseItem) {
        return <div className="container mx-auto py-10">{loadError || "案件が見つかりません。"}</div>
    }

    return (
        <div className="container mx-auto max-w-7xl px-2.5 py-3 lg:px-3">
            <div className="mb-2 flex items-center justify-between gap-2">
                <nav className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                    <Link href="/" className="hover:text-foreground transition-colors">案件一覧</Link>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="truncate text-foreground font-medium">{caseItem.deceasedName || "案件詳細"}</span>
                </nav>
                <Button
                    variant="outline"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    size="sm"
                    className="h-8 shrink-0 px-2.5 text-xs text-black hover:bg-white hover:text-black border-black/20"
                >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    {isDeleting ? "削除中..." : "この案件を削除"}
                </Button>
            </div>

            <div className="rounded-lg border bg-card p-3 text-card-foreground shadow-sm lg:p-3.5">
                <Suspense fallback={<div>Loading...</div>}>
                    <EditCaseFormPanel caseItem={caseItem} />
                </Suspense>
            </div>
        </div>
    )
}
