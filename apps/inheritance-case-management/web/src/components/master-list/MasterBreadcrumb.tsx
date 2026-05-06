import Link from "next/link"
import { ChevronRight } from "lucide-react"

interface MasterBreadcrumbProps {
    returnTo: string | null
    title: string
}

export function MasterBreadcrumb({ returnTo, title }: MasterBreadcrumbProps) {
    return (
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-foreground transition-colors">案件一覧</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            {returnTo ? (
                <>
                    <Link href={returnTo} className="hover:text-foreground transition-colors">前の画面</Link>
                    <ChevronRight className="h-3.5 w-3.5" />
                </>
            ) : (
                <>
                    <Link href="/settings" className="hover:text-foreground transition-colors">設定</Link>
                    <ChevronRight className="h-3.5 w-3.5" />
                </>
            )}
            <span className="text-foreground font-medium">{title}</span>
        </nav>
    )
}
