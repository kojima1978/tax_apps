"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getCaseDuplicates } from "@/lib/api/cases"
import type { CaseDuplicateInput, CaseDuplicateResult } from "@/lib/case-duplicates"

export function CaseDuplicateCandidates({ result }: { result: CaseDuplicateResult }) {
    return <div className="space-y-2">
        <p className="text-sm font-semibold text-amber-900">重複の可能性がある案件が{result.total}件あります</p>
        <ul className="space-y-2">
            {result.candidates.map(candidate => <li key={candidate.id} className="rounded-lg border border-amber-200 bg-white p-3 text-sm text-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 break-all font-semibold">{candidate.deceasedName}</span>
                    <Link href={`/${candidate.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center text-blue-700 underline">既存案件を確認（別タブ）</Link>
                </div>
                <p>{candidate.fiscalYear}年度 · {candidate.status} · 相続開始日 {candidate.dateOfDeath.replaceAll("-", "/")}</p>
                <p className="mt-1 text-xs font-medium text-amber-800">{[candidate.nameMatches && "氏名が一致", candidate.kanaMatches && "フリガナが一致", candidate.dateMatches && "相続開始日が一致"].filter(Boolean).join("・")}</p>
            </li>)}
        </ul>
        {result.total > result.candidates.length && <p className="text-xs text-slate-600">相続開始日が一致する案件を優先し、上位{result.candidates.length}件を表示しています。</p>}
    </div>
}

export function CaseDuplicateCheck(input: CaseDuplicateInput) {
    const key = JSON.stringify(input)
    const [debounced, setDebounced] = useState("")
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(key), 400)
        return () => clearTimeout(timer)
    }, [key])
    const hasName = Boolean(input.deceasedName.trim() || input.deceasedNameKana?.trim())
    const { data, isFetching, isError, refetch } = useQuery({
        queryKey: ["case-duplicates", debounced],
        enabled: hasName && debounced === key,
        queryFn: ({ signal }) => getCaseDuplicates(JSON.parse(debounced) as CaseDuplicateInput, signal),
        staleTime: 0,
    })
    if (!hasName) return <p className="mt-3 text-xs text-slate-600">氏名・フリガナを入力すると、全年度の既存案件と重複チェックします。</p>
    return <section aria-label="既存案件との重複チェック" className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3" aria-live="polite">
        {isFetching || debounced !== key ? <p className="text-sm text-slate-600">既存案件と照合中…</p>
            : isError ? <div className="text-sm text-red-700">重複チェックができませんでした。<button type="button" className="ml-2 min-h-11 underline" onClick={() => void refetch()}>再試行</button></div>
            : data?.total ? <CaseDuplicateCandidates result={data} />
            : <p className="text-sm text-slate-600">同じ氏名・フリガナの案件は見つかりませんでした。登録時にも再確認します。</p>}
    </section>
}
