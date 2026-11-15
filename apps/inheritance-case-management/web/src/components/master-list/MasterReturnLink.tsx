import Link from "next/link"
import { ChevronLeft } from "lucide-react"

/**
 * 案件など設定の外から開いたときだけ出す「戻る」。いま設定のどこに居るかは
 * 上のタブ行と見出しが示すので、`案件一覧 > 設定 > …` のパンくずは置かない。
 */
export function MasterReturnLink({ returnTo }: { returnTo: string | null }) {
    if (!returnTo) return null
    return (
        <Link href={returnTo} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            前の画面へ戻る
        </Link>
    )
}
