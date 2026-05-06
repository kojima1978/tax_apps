import { Building2, GitBranch, GitMerge, Network } from "lucide-react"
import { Button } from "@/components/ui/Button"
import type { Company, CompanyBranch } from "@/types/shared"
import { getBranchesFor, type ReferralTreeNode } from "./referral-source-utils"

interface ReferralSourceDetailsProps {
    selected: ReferralTreeNode | null
    companies: Company[]
    branches: CompanyBranch[]
    isCompanyReferrer: (companyId: number) => boolean
    isBranchReferrer: (companyId: number, branchId: number) => boolean
    onToggleCompanyReferrer: (company: Company) => void
    onToggleBranchReferrer: (branch: CompanyBranch) => void
    onStartMerge: (company: Company) => void
}

export function ReferralSourceDetails({
    selected,
    companies,
    branches,
    isCompanyReferrer,
    isBranchReferrer,
    onToggleCompanyReferrer,
    onToggleBranchReferrer,
    onStartMerge,
}: ReferralSourceDetailsProps) {
    if (!selected) {
        return (
            <div className="border rounded-lg bg-card p-6">
                <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-muted-foreground">
                    <Network className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm">左のツリーから会社または部門を選択してください</p>
                </div>
            </div>
        )
    }

    return (
        <div className="border rounded-lg bg-card p-6">
            {selected.type === "company" ? (
                <CompanyDetail
                    company={selected.company}
                    branches={getBranchesFor(branches, selected.company.id)}
                    isCompanyReferrer={isCompanyReferrer(selected.company.id)}
                    isBranchReferrer={(branchId) => isBranchReferrer(selected.company.id, branchId)}
                    onToggleCompanyReferrer={() => onToggleCompanyReferrer(selected.company)}
                    onToggleBranchReferrer={onToggleBranchReferrer}
                    onMerge={() => onStartMerge(selected.company)}
                    canMerge={companies.length >= 2}
                />
            ) : (
                <BranchDetail
                    branch={selected.branch}
                    company={selected.company}
                    isReferrer={isBranchReferrer(selected.company.id, selected.branch.id)}
                    onToggleReferrer={() => onToggleBranchReferrer(selected.branch)}
                />
            )}
        </div>
    )
}

function CompanyDetail({
    company,
    branches,
    isCompanyReferrer,
    isBranchReferrer,
    onToggleCompanyReferrer,
    onToggleBranchReferrer,
    onMerge,
    canMerge,
}: {
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

            <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold">会社全体を紹介者として登録</p>
                        <p className="text-xs text-muted-foreground mt-0.5">部門を指定せず、会社名のみで紹介者として使用できます</p>
                    </div>
                    <ToggleSwitch active={isCompanyReferrer} onToggle={onToggleCompanyReferrer} />
                </div>
            </div>

            {branches.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm font-semibold">部門ごとの紹介者設定</p>
                    <div className="border rounded-lg divide-y">
                        {branches.map(branch => (
                            <div key={branch.id} className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <GitBranch className="h-4 w-4 text-black/70" />
                                    <span className="text-sm">{branch.name}</span>
                                </div>
                                <ToggleSwitch active={isBranchReferrer(branch.id)} onToggle={() => onToggleBranchReferrer(branch)} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function BranchDetail({
    branch,
    company,
    isReferrer,
    onToggleReferrer,
}: {
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
                    <ToggleSwitch active={isReferrer} onToggle={onToggleReferrer} />
                </div>
            </div>
        </div>
    )
}

function ToggleSwitch({ active, onToggle }: { active: boolean; onToggle: () => void }) {
    return (
        <button
            onClick={onToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                active ? "bg-black" : "bg-white border border-black/20"
            }`}
        >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                active ? "translate-x-6" : "translate-x-1"
            }`} />
        </button>
    )
}
