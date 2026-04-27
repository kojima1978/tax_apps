"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { useToast } from "@/components/ui/Toast"
import type { Company, CompanyBranch, Referrer, MergeResult } from "@/types/shared"
import { getCompanies, createCompany, updateCompany, deleteCompany, mergeCompanies } from "@/lib/api/companies"
import { getCompanyBranches, createCompanyBranch, updateCompanyBranch, deleteCompanyBranch } from "@/lib/api/company-branches"
import { getReferrers, createReferrer, deleteReferrer } from "@/lib/api/referrers"
import { Modal } from "@/components/ui/Modal"
import {
    ChevronRight, ChevronDown, Building2, GitBranch, Plus, Trash2, Pencil, Check, X, Network, GitMerge,
} from "lucide-react"

type TreeNode =
    | { type: "company"; company: Company }
    | { type: "branch"; branch: CompanyBranch; company: Company }

function ReferralSourcesContent() {
    const toast = useToast()
    const searchParams = useSearchParams()
    const returnTo = searchParams.get("returnTo")
    const [companies, setCompanies] = useState<Company[]>([])
    const [branches, setBranches] = useState<CompanyBranch[]>([])
    const [referrers, setReferrers] = useState<Referrer[]>([])
    const [loading, setLoading] = useState(true)

    const [expanded, setExpanded] = useState<Set<number>>(new Set())
    const [selected, setSelected] = useState<TreeNode | null>(null)

    const [addingCompany, setAddingCompany] = useState(false)
    const [newCompanyName, setNewCompanyName] = useState("")
    const [addingBranchFor, setAddingBranchFor] = useState<number | null>(null)
    const [newBranchName, setNewBranchName] = useState("")

    const [editingNode, setEditingNode] = useState<TreeNode | null>(null)
    const [editName, setEditName] = useState("")

    const [mergeSource, setMergeSource] = useState<Company | null>(null)
    const [mergeTargetId, setMergeTargetId] = useState<number | null>(null)
    const [merging, setMerging] = useState(false)
    const [mergeResult, setMergeResult] = useState<MergeResult | null>(null)

    const reload = useCallback(async () => {
        try {
            const [c, b, r] = await Promise.all([getCompanies(), getCompanyBranches(), getReferrers()])
            setCompanies(c.filter(x => x.active).sort((a, b) => a.name.localeCompare(b.name)))
            setBranches(b.filter(x => x.active))
            setReferrers(r.filter(x => x.active))
        } catch {
            toast.error("データの取得に失敗しました")
        } finally {
            setLoading(false)
        }
    }, [toast])

    useEffect(() => { reload() }, [reload])

    const toggleExpand = (companyId: number) =>
        setExpanded(prev => {
            const next = new Set(prev)
            next.has(companyId) ? next.delete(companyId) : next.add(companyId)
            return next
        })

    const branchesFor = (companyId: number) =>
        branches.filter(b => b.companyId === companyId).sort((a, b) => a.name.localeCompare(b.name))

    const findReferrer = (companyId: number, branchId: number | null) =>
        referrers.find(r => r.companyId === companyId && (branchId ? r.branchId === branchId : !r.branchId))

    const isCompanyReferrer = (companyId: number) => !!findReferrer(companyId, null)

    const isBranchReferrer = (companyId: number, branchId: number) => !!findReferrer(companyId, branchId)

    const handleAddCompany = async () => {
        const name = newCompanyName.trim()
        if (!name) return
        try {
            const created = await createCompany({ name })
            await createReferrer({ companyId: created.id, branchId: null })
            setNewCompanyName("")
            setAddingCompany(false)
            await reload()
            setExpanded(prev => new Set(prev).add(created.id))
            toast.success(`${name} を追加しました`)
        } catch {
            toast.error("会社の追加に失敗しました")
        }
    }

    const handleAddBranch = async (companyId: number) => {
        const name = newBranchName.trim()
        if (!name) return
        try {
            const created = await createCompanyBranch({ companyId, name })
            await createReferrer({ companyId, branchId: created.id })
            setNewBranchName("")
            setAddingBranchFor(null)
            await reload()
            toast.success(`${name} を追加しました`)
        } catch {
            toast.error("部門の追加に失敗しました")
        }
    }

    const handleToggleCompanyReferrer = async (company: Company) => {
        const existing = findReferrer(company.id, null)
        try {
            if (existing) {
                await deleteReferrer(existing.id)
                toast.success(`${company.name}（会社全体）の紹介者登録を解除しました`)
            } else {
                await createReferrer({ companyId: company.id, branchId: null })
                toast.success(`${company.name}（会社全体）を紹介者として登録しました`)
            }
            await reload()
        } catch {
            toast.error("紹介者の更新に失敗しました")
        }
    }

    const handleToggleBranchReferrer = async (branch: CompanyBranch) => {
        const existing = findReferrer(branch.companyId, branch.id)
        try {
            if (existing) {
                await deleteReferrer(existing.id)
                toast.success(`${branch.name} の紹介者登録を解除しました`)
            } else {
                await createReferrer({ companyId: branch.companyId, branchId: branch.id })
                toast.success(`${branch.name} を紹介者として登録しました`)
            }
            await reload()
        } catch {
            toast.error("紹介者の更新に失敗しました")
        }
    }

    const handleStartEdit = (node: TreeNode) => {
        setEditingNode(node)
        setEditName(node.type === "company" ? node.company.name : node.branch.name)
    }

    const handleSaveEdit = async () => {
        if (!editingNode) return
        const name = editName.trim()
        if (!name) return
        try {
            if (editingNode.type === "company") {
                await updateCompany(editingNode.company.id, { name })
            } else {
                await updateCompanyBranch(editingNode.branch.id, { companyId: editingNode.branch.companyId, name })
            }
            setEditingNode(null)
            await reload()
            toast.success("名称を更新しました")
        } catch {
            toast.error("更新に失敗しました")
        }
    }

    const handleDelete = async (node: TreeNode) => {
        const label = node.type === "company" ? node.company.name : node.branch.name
        if (!confirm(`「${label}」を削除しますか？紐付く紹介者も削除されます。`)) return
        try {
            if (node.type === "company") {
                const companyReferrers = referrers.filter(r => r.companyId === node.company.id)
                for (const r of companyReferrers) await deleteReferrer(r.id)
                const companyBranches = branches.filter(b => b.companyId === node.company.id)
                for (const b of companyBranches) await deleteCompanyBranch(b.id)
                await deleteCompany(node.company.id)
            } else {
                const branchReferrer = findReferrer(node.branch.companyId, node.branch.id)
                if (branchReferrer) await deleteReferrer(branchReferrer.id)
                await deleteCompanyBranch(node.branch.id)
            }
            if (selected && node.type === selected.type) {
                const id = node.type === "company" ? node.company.id : node.branch.id
                const selectedId = selected.type === "company" ? selected.company.id : selected.branch.id
                if (id === selectedId) setSelected(null)
            }
            await reload()
            toast.success(`${label} を削除しました`)
        } catch {
            toast.error("削除に失敗しました。案件で使用中の可能性があります。")
        }
    }

    const handleMerge = async () => {
        if (!mergeSource || !mergeTargetId) return
        setMerging(true)
        try {
            const result = await mergeCompanies(mergeSource.id, mergeTargetId)
            setMergeResult(result)
            setSelected(null)
            await reload()
        } catch {
            toast.error("マージに失敗しました")
            setMergeSource(null)
        } finally {
            setMerging(false)
        }
    }

    const closeMergeModal = () => {
        setMergeSource(null)
        setMergeTargetId(null)
        setMergeResult(null)
    }

    const isEditingThis = (node: TreeNode) => {
        if (!editingNode) return false
        if (node.type !== editingNode.type) return false
        if (node.type === "company" && editingNode.type === "company") return node.company.id === editingNode.company.id
        if (node.type === "branch" && editingNode.type === "branch") return node.branch.id === editingNode.branch.id
        return false
    }

    const isSelectedThis = (node: TreeNode) => {
        if (!selected) return false
        if (node.type !== selected.type) return false
        if (node.type === "company" && selected.type === "company") return node.company.id === selected.company.id
        if (node.type === "branch" && selected.type === "branch") return node.branch.id === selected.branch.id
        return false
    }

    if (loading) {
        return <div className="container mx-auto py-10 max-w-4xl px-4"><p className="text-muted-foreground">読み込み中...</p></div>
    }

    return (
        <div className="container mx-auto py-10 max-w-4xl px-4">
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
                <span className="text-foreground font-medium">紹介元管理</span>
            </nav>

            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-lg bg-white text-black border border-black/10">
                    <Network className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold">紹介元管理</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
                {/* Left: Tree */}
                <div className="border rounded-lg bg-card p-4 space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-muted-foreground">会社・部門ツリー</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => { setAddingCompany(true); setAddingBranchFor(null) }}
                        >
                            <Plus className="h-3 w-3 mr-1" />会社追加
                        </Button>
                    </div>

                    {addingCompany && (
                        <div className="flex items-center gap-1 mb-2 pl-2">
                            <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                            <Input
                                value={newCompanyName}
                                onChange={e => setNewCompanyName(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleAddCompany()}
                                placeholder="会社名"
                                className="h-8 text-sm"
                                autoFocus
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-black/70" onClick={handleAddCompany}>
                                <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setAddingCompany(false); setNewCompanyName("") }}>
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}

                    {companies.length === 0 && !addingCompany && (
                        <p className="text-sm text-muted-foreground pl-2">会社が登録されていません</p>
                    )}

                    {companies.map(company => {
                        const companyNode: TreeNode = { type: "company", company }
                        const isExpanded = expanded.has(company.id)
                        const cBranches = branchesFor(company.id)
                        const hasCompanyRef = isCompanyReferrer(company.id)
                        const branchRefCount = cBranches.filter(b => isBranchReferrer(company.id, b.id)).length

                        return (
                            <div key={company.id}>
                                {/* Company row */}
                                <div
                                    className={`group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                                        isSelectedThis(companyNode) ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                                    }`}
                                    onClick={() => { setSelected(companyNode); if (!isExpanded) toggleExpand(company.id) }}
                                >
                                    <button
                                        className="shrink-0 p-0.5 hover:bg-muted rounded"
                                        onClick={e => { e.stopPropagation(); toggleExpand(company.id) }}
                                    >
                                        {isExpanded
                                            ? <ChevronDown className="h-3.5 w-3.5" />
                                            : <ChevronRight className="h-3.5 w-3.5" />
                                        }
                                    </button>
                                    <Building2 className="h-4 w-4 text-black/70 shrink-0" />

                                    {isEditingThis(companyNode) ? (
                                        <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                                            <Input
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditingNode(null) }}
                                                className="h-7 text-sm flex-1"
                                                autoFocus
                                            />
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-black/70" onClick={handleSaveEdit}>
                                                <Check className="h-3 w-3" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingNode(null)}>
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-sm font-medium truncate flex-1">{company.name}</span>
                                            <div className="flex items-center gap-1">
                                                {hasCompanyRef && (
                                                    <span className="text-[10px] bg-white text-black border border-black/10 px-1.5 py-0.5 rounded-full font-medium">会社</span>
                                                )}
                                                {branchRefCount > 0 && (
                                                    <span className="text-[10px] bg-white text-black border border-black/10 px-1.5 py-0.5 rounded-full font-medium">{branchRefCount}部門</span>
                                                )}
                                            </div>
                                            <div className="hidden group-hover:flex items-center gap-0.5">
                                                <button className="p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); handleStartEdit(companyNode) }}>
                                                    <Pencil className="h-3 w-3 text-muted-foreground" />
                                                </button>
                                                <button className="p-1 rounded hover:bg-destructive/10" onClick={e => { e.stopPropagation(); handleDelete(companyNode) }}>
                                                    <Trash2 className="h-3 w-3 text-destructive" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Branches */}
                                {isExpanded && (
                                    <div className="ml-5 border-l pl-2 space-y-0.5 mt-0.5">
                                        {cBranches.map(branch => {
                                            const branchNode: TreeNode = { type: "branch", branch, company }
                                            const hasBranchRef = isBranchReferrer(company.id, branch.id)

                                            return (
                                                <div
                                                    key={branch.id}
                                                    className={`group flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition-colors ${
                                                        isSelectedThis(branchNode) ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                                                    }`}
                                                    onClick={() => setSelected(branchNode)}
                                                >
                                                    <GitBranch className="h-3.5 w-3.5 text-black/70 shrink-0" />

                                                    {isEditingThis(branchNode) ? (
                                                        <div className="flex items-center gap-1 flex-1 min-w-0" onClick={e => e.stopPropagation()}>
                                                            <Input
                                                                value={editName}
                                                                onChange={e => setEditName(e.target.value)}
                                                                onKeyDown={e => { if (e.key === "Enter") handleSaveEdit(); if (e.key === "Escape") setEditingNode(null) }}
                                                                className="h-7 text-sm flex-1"
                                                                autoFocus
                                                            />
                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-black/70" onClick={handleSaveEdit}>
                                                                <Check className="h-3 w-3" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingNode(null)}>
                                                                <X className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <span className="text-sm truncate flex-1">{branch.name}</span>
                                                            {hasBranchRef && (
                                                                <Check className="h-3.5 w-3.5 text-black/70 shrink-0" />
                                                            )}
                                                            <div className="hidden group-hover:flex items-center gap-0.5">
                                                                <button className="p-1 rounded hover:bg-muted" onClick={e => { e.stopPropagation(); handleStartEdit(branchNode) }}>
                                                                    <Pencil className="h-3 w-3 text-muted-foreground" />
                                                                </button>
                                                                <button className="p-1 rounded hover:bg-destructive/10" onClick={e => { e.stopPropagation(); handleDelete(branchNode) }}>
                                                                    <Trash2 className="h-3 w-3 text-destructive" />
                                                                </button>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )
                                        })}

                                        {/* Add branch inline */}
                                        {addingBranchFor === company.id ? (
                                            <div className="flex items-center gap-1 px-2 py-1">
                                                <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                <Input
                                                    value={newBranchName}
                                                    onChange={e => setNewBranchName(e.target.value)}
                                                    onKeyDown={e => e.key === "Enter" && handleAddBranch(company.id)}
                                                    placeholder="部門名"
                                                    className="h-7 text-sm flex-1"
                                                    autoFocus
                                                />
                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-black/70" onClick={() => handleAddBranch(company.id)}>
                                                    <Check className="h-3 w-3" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setAddingBranchFor(null); setNewBranchName("") }}>
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <button
                                                className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full rounded-md hover:bg-muted/50"
                                                onClick={() => { setAddingBranchFor(company.id); setAddingCompany(false) }}
                                            >
                                                <Plus className="h-3 w-3" />
                                                部門を追加
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Right: Detail panel */}
                <div className="border rounded-lg bg-card p-6">
                    {!selected ? (
                        <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground">
                            <Network className="h-12 w-12 mb-3 opacity-30" />
                            <p className="text-sm">左のツリーから会社または部門を選択してください</p>
                        </div>
                    ) : selected.type === "company" ? (
                        <CompanyDetail
                            company={selected.company}
                            branches={branchesFor(selected.company.id)}
                            isCompanyReferrer={isCompanyReferrer(selected.company.id)}
                            isBranchReferrer={(branchId) => isBranchReferrer(selected.company.id, branchId)}
                            onToggleCompanyReferrer={() => handleToggleCompanyReferrer(selected.company)}
                            onToggleBranchReferrer={(branch) => handleToggleBranchReferrer(branch)}
                            onMerge={() => { setMergeSource(selected.company); setMergeTargetId(null); setMergeResult(null) }}
                            canMerge={companies.length >= 2}
                        />
                    ) : (
                        <BranchDetail
                            branch={selected.branch}
                            company={selected.company}
                            isReferrer={isBranchReferrer(selected.company.id, selected.branch.id)}
                            onToggleReferrer={() => handleToggleBranchReferrer(selected.branch)}
                        />
                    )}
                </div>
            </div>

            <Modal isOpen={!!mergeSource} onClose={closeMergeModal} title="会社のマージ">
                {mergeResult ? (
                    <div className="space-y-4">
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm space-y-1">
                            <p className="font-semibold text-gray-800">マージが完了しました</p>
                            <p className="text-gray-700">「{mergeResult.sourceCompany}」→「{mergeResult.targetCompany}」</p>
                            <ul className="text-black/70 text-xs mt-2 space-y-0.5">
                                <li>移動した部門: {mergeResult.branchesMoved}件</li>
                                <li>統合した部門: {mergeResult.branchesMerged}件</li>
                                <li>移動した紹介者: {mergeResult.referrersMoved}件</li>
                                <li>再割当した案件: {mergeResult.casesReassigned}件</li>
                            </ul>
                        </div>
                        <div className="flex justify-end">
                            <Button onClick={closeMergeModal}>閉じる</Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-800">
                            <p className="font-semibold mb-1">マージ元: {mergeSource?.name}</p>
                            <p className="text-xs text-black/70">この会社の部門・紹介者・案件紐付きをすべてマージ先に移動し、この会社を無効化します。</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1.5">マージ先の会社</label>
                            <select
                                value={mergeTargetId ?? ""}
                                onChange={e => setMergeTargetId(e.target.value ? Number(e.target.value) : null)}
                                className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="">選択してください</option>
                                {companies.filter(c => c.id !== mergeSource?.id).map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-3">
                            <Button variant="ghost" onClick={closeMergeModal} disabled={merging}>キャンセル</Button>
                            <Button onClick={handleMerge} disabled={!mergeTargetId || merging}>
                                {merging ? "処理中..." : "マージ実行"}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    )
}

function CompanyDetail({ company, branches, isCompanyReferrer, isBranchReferrer, onToggleCompanyReferrer, onToggleBranchReferrer, onMerge, canMerge }: {
    company: Company
    branches: CompanyBranch[]
    isCompanyReferrer: boolean
    isBranchReferrer: (branchId: number) => boolean
    onToggleCompanyReferrer: () => void
    onToggleBranchReferrer: (branch: CompanyBranch) => void
    onMerge: () => void
    canMerge: boolean
}) {
    return (
        <div className="space-y-6">
            <div>
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-black/70" />
                        <h2 className="text-lg font-bold">{company.name}</h2>
                    </div>
                    {canMerge && (
                        <Button variant="outline" size="sm" className="text-xs" onClick={onMerge}>
                            <GitMerge className="h-3.5 w-3.5 mr-1" />他社にマージ
                        </Button>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">会社の紹介者設定を管理します</p>
            </div>

            {/* Company-level referrer toggle */}
            <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold">会社全体を紹介者として登録</p>
                        <p className="text-xs text-muted-foreground mt-0.5">部門を指定せず、会社名のみで紹介者として使用できます</p>
                    </div>
                    <button
                        onClick={onToggleCompanyReferrer}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            isCompanyReferrer ? "bg-black" : "bg-white border border-black/20"
                        }`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isCompanyReferrer ? "translate-x-6" : "translate-x-1"
                        }`} />
                    </button>
                </div>
            </div>

            {/* Branch referrer list */}
            {branches.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm font-semibold">部門ごとの紹介者設定</p>
                    <div className="border rounded-lg divide-y">
                        {branches.map(branch => {
                            const hasRef = isBranchReferrer(branch.id)
                            return (
                                <div key={branch.id} className="flex items-center justify-between px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <GitBranch className="h-4 w-4 text-black/70" />
                                        <span className="text-sm">{branch.name}</span>
                                    </div>
                                    <button
                                        onClick={() => onToggleBranchReferrer(branch)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                            hasRef ? "bg-black" : "bg-white border border-black/20"
                                        }`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                            hasRef ? "translate-x-6" : "translate-x-1"
                                        }`} />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

function BranchDetail({ branch, company, isReferrer, onToggleReferrer }: {
    branch: CompanyBranch
    company: Company
    isReferrer: boolean
    onToggleReferrer: () => void
}) {
    return (
        <div className="space-y-6">
            <div>
                <p className="text-xs text-muted-foreground mb-1">{company.name}</p>
                <div className="flex items-center gap-2 mb-1">
                    <GitBranch className="h-5 w-5 text-black/70" />
                    <h2 className="text-lg font-bold">{branch.name}</h2>
                </div>
                <p className="text-xs text-muted-foreground">部門の紹介者設定を管理します</p>
            </div>

            <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold">紹介者として登録</p>
                        <p className="text-xs text-muted-foreground mt-0.5">案件の紹介者として「{company.name} / {branch.name}」が選択可能になります</p>
                    </div>
                    <button
                        onClick={onToggleReferrer}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            isReferrer ? "bg-black" : "bg-white border border-black/20"
                        }`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isReferrer ? "translate-x-6" : "translate-x-1"
                        }`} />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function ReferralSourcesPage() {
    return (
        <Suspense fallback={<div className="container mx-auto py-10 px-4"><p className="text-muted-foreground">読み込み中...</p></div>}>
            <ReferralSourcesContent />
        </Suspense>
    )
}
