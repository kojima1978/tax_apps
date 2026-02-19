"use client"

import { useState } from "react"
import { columns } from "./columns"
import { DataTable } from "./data-table"
import { useCases } from "@/hooks/use-cases"
import { useExportCSV } from "@/hooks/use-export-csv"
import type { CasesQueryParams } from "@/lib/api/cases"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Home, Plus, RefreshCw, Search, Download } from "lucide-react"
import type { CaseStatus, AcceptanceStatus } from "@/types/shared"
import { ArrowUpDown } from "lucide-react"
import { TableSkeleton } from "@/components/ui/Skeleton"
import { ErrorDisplay } from "@/components/ui/ErrorDisplay"
import { parseError } from "@/hooks/use-error-handler"

type SortField = 'deceasedName' | 'dateOfDeath' | 'fiscalYear' | 'status' | 'taxAmount' | 'feeAmount' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

const SELECT_CLASS = "border rounded px-3 py-2"

export default function InheritanceMockupPage() {
    const [queryParams, setQueryParams] = useState<CasesQueryParams>({
        page: 1,
        pageSize: 30,
    })
    const [searchInput, setSearchInput] = useState("")

    const { data, isLoading, isError, error, refetch, isFetching } = useCases(queryParams)
    const { exportCSV, isExporting } = useExportCSV()
    const cases = data?.data ?? []
    const pagination = data?.pagination

    const handleSearch = () => {
        setQueryParams(prev => ({ ...prev, search: searchInput, page: 1 }))
    }

    const handleFilterChange = (key: keyof CasesQueryParams, value: string | undefined) => {
        setQueryParams(prev => ({ ...prev, [key]: value || undefined, page: 1 }))
    }

    const handlePageChange = (newPage: number) => {
        setQueryParams(prev => ({ ...prev, page: newPage }))
    }

    return (
        <div className="container mx-auto py-10">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <a href="/" title="ポータルに戻る" className="text-gray-400 hover:text-primary transition-colors">
                        <Home className="h-5 w-5" />
                    </a>
                    <h1 className="text-2xl font-bold">相続税申告案件一覧</h1>
                </div>
                <div className="flex gap-2 items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                        variant="outline"
                        onClick={exportCSV}
                        disabled={isExporting}
                    >
                        <Download className={`mr-2 h-4 w-4 ${isExporting ? 'animate-pulse' : ''}`} />
                        {isExporting ? 'エクスポート中...' : 'CSV出力'}
                    </Button>
                    <Link href="/analytics">
                        <Button variant="outline">経営分析</Button>
                    </Link>
                    <Link href="/settings">
                        <Button variant="outline">マスタ設定</Button>
                    </Link>
                    <Link href="/new">
                        <Button variant="outline">
                            <Plus className="mr-2 h-4 w-4" />
                            新規案件登録
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4 mb-4 flex-wrap">
                <div className="flex gap-2">
                    <Input
                        placeholder="被相続人名で検索..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        className="w-64"
                    />
                    <Button variant="outline" onClick={handleSearch}>
                        <Search className="h-4 w-4" />
                    </Button>
                </div>
                <select
                    className={SELECT_CLASS}
                    value={queryParams.status || ""}
                    onChange={(e) => handleFilterChange("status", e.target.value as CaseStatus)}
                >
                    <option value="">ステータス: すべて</option>
                    <option value="未着手">未着手</option>
                    <option value="進行中">進行中</option>
                    <option value="完了">完了</option>
                    <option value="請求済">請求済</option>
                </select>
                <select
                    className={SELECT_CLASS}
                    value={queryParams.acceptanceStatus || ""}
                    onChange={(e) => handleFilterChange("acceptanceStatus", e.target.value as AcceptanceStatus)}
                >
                    <option value="">受託状況: すべて</option>
                    <option value="受託可">受託可</option>
                    <option value="受託不可">受託不可</option>
                    <option value="未判定">未判定</option>
                    <option value="保留">保留</option>
                </select>
                <select
                    className={SELECT_CLASS}
                    value={queryParams.fiscalYear || ""}
                    onChange={(e) => handleFilterChange("fiscalYear", e.target.value)}
                >
                    <option value="">年度: すべて</option>
                    {[2025, 2024, 2023, 2022].map(year => (
                        <option key={year} value={year}>{year}年度</option>
                    ))}
                </select>
                <div className="flex items-center gap-1">
                    <ArrowUpDown className="h-4 w-4 text-gray-500" />
                    <select
                        className={SELECT_CLASS}
                        value={`${queryParams.sortBy || 'createdAt'}_${queryParams.sortOrder || 'desc'}`}
                        onChange={(e) => {
                            const [field, order] = e.target.value.split('_') as [SortField, SortOrder];
                            setQueryParams(prev => ({ ...prev, sortBy: field, sortOrder: order, page: 1 }));
                        }}
                    >
                        <option value="createdAt_desc">登録日 (新しい順)</option>
                        <option value="createdAt_asc">登録日 (古い順)</option>
                        <option value="dateOfDeath_desc">死亡日 (新しい順)</option>
                        <option value="dateOfDeath_asc">死亡日 (古い順)</option>
                        <option value="deceasedName_asc">氏名 (昇順)</option>
                        <option value="deceasedName_desc">氏名 (降順)</option>
                        <option value="fiscalYear_desc">年度 (新しい順)</option>
                        <option value="fiscalYear_asc">年度 (古い順)</option>
                        <option value="taxAmount_desc">税額 (高い順)</option>
                        <option value="taxAmount_asc">税額 (低い順)</option>
                        <option value="feeAmount_desc">報酬 (高い順)</option>
                        <option value="feeAmount_asc">報酬 (低い順)</option>
                    </select>
                </div>
                {(queryParams.search || queryParams.status || queryParams.acceptanceStatus || queryParams.fiscalYear) && (
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setQueryParams({ page: 1, pageSize: 30 })
                            setSearchInput("")
                        }}
                    >
                        フィルタをクリア
                    </Button>
                )}
            </div>

            {isLoading ? (
                <TableSkeleton rows={10} />
            ) : isError ? (
                <ErrorDisplay error={parseError(error)} onRetry={() => refetch()} />
            ) : (
                <div className="relative">
                    {isFetching && (
                        <div className="absolute inset-0 bg-background/50 z-10 flex items-center justify-center">
                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                更新中...
                            </div>
                        </div>
                    )}
                    <DataTable columns={columns} data={cases} />

                    {/* Pagination */}
                    {pagination && pagination.totalPages > 1 && (
                        <div className="flex justify-between items-center mt-4">
                            <div className="text-sm text-gray-500">
                                全{pagination.total}件中 {(pagination.page - 1) * pagination.pageSize + 1}-
                                {Math.min(pagination.page * pagination.pageSize, pagination.total)}件を表示
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    disabled={pagination.page <= 1}
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                >
                                    前へ
                                </Button>
                                <span className="px-4 py-2">
                                    {pagination.page} / {pagination.totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    disabled={pagination.page >= pagination.totalPages}
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                >
                                    次へ
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
