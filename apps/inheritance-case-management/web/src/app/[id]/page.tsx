"use client"

import { useEffect, useState, use, Suspense } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import type { InheritanceCase } from "@/types/shared"
import { Button } from "@/components/ui/Button"
import Link from "next/link"
import { EditCaseForm } from "./edit-case-form"
import { getCase, deleteCase } from "@/lib/api/cases"
import { CASES_QUERY_KEY } from "@/hooks/use-cases"
import { useToast } from "@/components/ui/Toast"
import { Trash2, ChevronRight } from "lucide-react"

export default function InheritanceCaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const queryClient = useQueryClient()
    const toast = useToast()
    const [caseItem, setCaseItem] = useState<InheritanceCase | undefined>(undefined)
    const [isLoading, setIsLoading] = useState(true)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        const load = async () => {
            try {
                const item = await getCase(id)
                if (item) {
                    setCaseItem(item)
                }
            } catch (e) {
                console.error(e)
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
            await deleteCase(id)
            queryClient.removeQueries({ queryKey: CASES_QUERY_KEY })
            toast.success("案件を削除しました")
            router.push("/")
        } catch (e) {
            console.error(e)
            toast.error("削除に失敗しました: " + String(e))
        } finally {
            setIsDeleting(false)
        }
    }

    if (isLoading) {
        return <div className="p-10 text-center">読み込み中...</div>
    }

    if (!caseItem) {
        return <div className="container mx-auto py-10">案件が見つかりません。</div>
    }

    return (
        <div className="container mx-auto py-10 max-w-5xl px-4">
            <div className="mb-6 flex justify-between items-center flex-wrap gap-2">
                <nav className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Link href="/" className="hover:text-foreground transition-colors">案件一覧</Link>
                    <ChevronRight className="h-3.5 w-3.5" />
                    <span className="text-foreground font-medium">{caseItem.deceasedName || "案件詳細"}</span>
                </nav>
                <Button
                    variant="outline"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? "削除中..." : "この案件を削除"}
                </Button>
            </div>

            <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
                <div className="mb-8 border-b pb-4">
                    <h1 className="text-2xl font-bold tracking-tight">案件詳細編集</h1>
                    <p className="text-muted-foreground">案件ID: {caseItem.id}</p>
                </div>

                <Suspense fallback={<div>Loading...</div>}>
                    <EditCaseForm initialData={caseItem} />
                </Suspense>
            </div>
        </div>
    )
}
