import { Button } from "@/components/ui/Button"

interface PaginationProps {
    page: number
    pageSize: number
    total: number
    totalPages: number
    onPageChange: (page: number) => void
}

export function Pagination({ page, pageSize, total, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null

    return (
        <div className="flex justify-between items-center mt-4 py-3 px-1">
            <div className="text-sm text-muted-foreground">
                全{total}件中 {(page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, total)}件を表示
            </div>
            <div className="flex gap-2 items-center">
                <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    前へ
                </Button>
                <span className="text-sm font-medium min-w-[60px] text-center">
                    {page} / {totalPages}
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                >
                    次へ
                </Button>
            </div>
        </div>
    )
}
