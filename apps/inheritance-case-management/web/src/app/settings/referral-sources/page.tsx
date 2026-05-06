"use client"

import { Suspense, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Network } from "lucide-react"
import { MasterBreadcrumb } from "@/components/master-list/MasterBreadcrumb"
import { useToast } from "@/components/ui/Toast"
import type { Company, CompanyBranch, MergeResult, Referrer } from "@/types/shared"
import { createCompany, deleteCompany, getCompanies, mergeCompanies, updateCompany } from "@/lib/api/companies"
import { createCompanyBranch, deleteCompanyBranch, getCompanyBranches, updateCompanyBranch } from "@/lib/api/company-branches"
import { createReferrer, deleteReferrer, getReferrers } from "@/lib/api/referrers"
import { CompanyMergeModal } from "./CompanyMergeModal"
import { ReferralSourceDetails } from "./ReferralSourceDetails"
import { ReferralSourceTree } from "./ReferralSourceTree"
import {
    findReferrer,
    getBranchesFor,
    getReferralNodeName,
    isSameReferralNode,
    type ReferralTreeNode,
} from "./referral-source-utils"

function ReferralSourcesContent() {
    const toast = useToast()
    const searchParams = useSearchParams()
    const returnTo = searchParams.get("returnTo")

    const [companies, setCompanies] = useState<Company[]>([])
    const [branches, setBranches] = useState<CompanyBranch[]>([])
    const [referrers, setReferrers] = useState<Referrer[]>([])
    const [loading, setLoading] = useState(true)

    const [expanded, setExpanded] = useState<Set<number>>(new Set())
    const [selected, setSelected] = useState<ReferralTreeNode | null>(null)

    const [addingCompany, setAddingCompany] = useState(false)
    const [newCompanyName, setNewCompanyName] = useState("")
    const [addingBranchFor, setAddingBranchFor] = useState<number | null>(null)
    const [newBranchName, setNewBranchName] = useState("")

    const [editingNode, setEditingNode] = useState<ReferralTreeNode | null>(null)
    const [editName, setEditName] = useState("")

    const [mergeSource, setMergeSource] = useState<Company | null>(null)
    const [mergeTargetId, setMergeTargetId] = useState<number | null>(null)
    const [merging, setMerging] = useState(false)
    const [mergeResult, setMergeResult] = useState<MergeResult | null>(null)

    const reload = useCallback(async () => {
        try {
            const [companyData, branchData, referrerData] = await Promise.all([getCompanies(), getCompanyBranches(), getReferrers()])
            setCompanies(companyData.filter(company => company.active).sort((a, b) => a.name.localeCompare(b.name)))
            setBranches(branchData.filter(branch => branch.active))
            setReferrers(referrerData.filter(referrer => referrer.active))
        } catch {
            toast.error("データの取得に失敗しました")
        } finally {
            setLoading(false)
        }
    }, [toast])

    useEffect(() => { reload() }, [reload])

    const toggleExpand = (companyId: number) => {
        setExpanded(prev => {
            const next = new Set(prev)
            if (next.has(companyId)) {
                next.delete(companyId)
            } else {
                next.add(companyId)
            }
            return next
        })
    }

    const isCompanyReferrer = (companyId: number) => !!findReferrer(referrers, companyId, null)
    const isBranchReferrer = (companyId: number, branchId: number) => !!findReferrer(referrers, companyId, branchId)

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
        const existing = findReferrer(referrers, company.id, null)
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
        const existing = findReferrer(referrers, branch.companyId, branch.id)
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

    const handleStartEdit = (node: ReferralTreeNode) => {
        setEditingNode(node)
        setEditName(getReferralNodeName(node))
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

    const handleDelete = async (node: ReferralTreeNode) => {
        const label = getReferralNodeName(node)
        if (!confirm(`「${label}」を削除しますか？紐付く紹介者も削除されます。`)) return

        try {
            if (node.type === "company") {
                const companyReferrers = referrers.filter(referrer => referrer.companyId === node.company.id)
                for (const referrer of companyReferrers) await deleteReferrer(referrer.id)
                for (const branch of getBranchesFor(branches, node.company.id)) await deleteCompanyBranch(branch.id)
                await deleteCompany(node.company.id)
            } else {
                const branchReferrer = findReferrer(referrers, node.branch.companyId, node.branch.id)
                if (branchReferrer) await deleteReferrer(branchReferrer.id)
                await deleteCompanyBranch(node.branch.id)
            }

            if (isSameReferralNode(selected, node)) setSelected(null)
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

    if (loading) {
        return <div className="container mx-auto py-10 max-w-4xl px-4"><p className="text-muted-foreground">読み込み中...</p></div>
    }

    return (
        <div className="container mx-auto py-10 max-w-4xl px-4">
            <MasterBreadcrumb returnTo={returnTo} title="紹介元管理" />

            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-lg bg-white text-black border border-black/10">
                    <Network className="h-6 w-6" />
                </div>
                <h1 className="text-2xl font-bold">紹介元管理</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4">
                <ReferralSourceTree
                    companies={companies}
                    branches={branches}
                    expanded={expanded}
                    selected={selected}
                    addingCompany={addingCompany}
                    newCompanyName={newCompanyName}
                    addingBranchFor={addingBranchFor}
                    newBranchName={newBranchName}
                    editingNode={editingNode}
                    editName={editName}
                    isCompanyReferrer={isCompanyReferrer}
                    isBranchReferrer={isBranchReferrer}
                    onToggleExpand={toggleExpand}
                    onSelect={setSelected}
                    onStartAddingCompany={() => {
                        setAddingCompany(true)
                        setAddingBranchFor(null)
                    }}
                    onCancelAddingCompany={() => {
                        setAddingCompany(false)
                        setNewCompanyName("")
                    }}
                    onNewCompanyNameChange={setNewCompanyName}
                    onAddCompany={handleAddCompany}
                    onStartAddingBranch={(companyId) => {
                        setAddingBranchFor(companyId)
                        setAddingCompany(false)
                    }}
                    onCancelAddingBranch={() => {
                        setAddingBranchFor(null)
                        setNewBranchName("")
                    }}
                    onNewBranchNameChange={setNewBranchName}
                    onAddBranch={handleAddBranch}
                    onStartEdit={handleStartEdit}
                    onEditNameChange={setEditName}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={() => setEditingNode(null)}
                    onDelete={handleDelete}
                />

                <ReferralSourceDetails
                    selected={selected}
                    companies={companies}
                    branches={branches}
                    isCompanyReferrer={isCompanyReferrer}
                    isBranchReferrer={isBranchReferrer}
                    onToggleCompanyReferrer={handleToggleCompanyReferrer}
                    onToggleBranchReferrer={handleToggleBranchReferrer}
                    onStartMerge={(company) => {
                        setMergeSource(company)
                        setMergeTargetId(null)
                        setMergeResult(null)
                    }}
                />
            </div>

            <CompanyMergeModal
                companies={companies}
                mergeSource={mergeSource}
                mergeTargetId={mergeTargetId}
                merging={merging}
                mergeResult={mergeResult}
                onTargetChange={setMergeTargetId}
                onMerge={handleMerge}
                onClose={closeMergeModal}
            />
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
