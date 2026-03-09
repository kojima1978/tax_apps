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
        <div className="flex justify-between items-center mt-4">
            <div className="text-sm text-gray-500">
                全{total}件中 {(page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, total)}件を表示
            </div>
            <div className="flex gap-2">
                <Button
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => onPageChange(page - 1)}
                >
                    前へ
                </Button>
                <span className="px-4 py-2">
                    {page} / {totalPages}
                </span>
                <Button
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => onPageChange(page + 1)}
                >
                    次へ
                </Button>
            </div>
        </div>
    )
}
