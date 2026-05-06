import type { Company, CompanyBranch, Referrer } from "@/types/shared"

export type ReferralTreeNode =
    | { type: "company"; company: Company }
    | { type: "branch"; branch: CompanyBranch; company: Company }

export function getBranchesFor(branches: CompanyBranch[], companyId: number) {
    return branches
        .filter(branch => branch.companyId === companyId)
        .sort((a, b) => a.name.localeCompare(b.name))
}

export function findReferrer(referrers: Referrer[], companyId: number, branchId: number | null) {
    return referrers.find(referrer =>
        referrer.companyId === companyId && (branchId ? referrer.branchId === branchId : !referrer.branchId)
    )
}

export function isSameReferralNode(a: ReferralTreeNode | null, b: ReferralTreeNode | null) {
    if (!a || !b || a.type !== b.type) return false
    if (a.type === "company" && b.type === "company") return a.company.id === b.company.id
    if (a.type === "branch" && b.type === "branch") return a.branch.id === b.branch.id
    return false
}

export function getReferralNodeName(node: ReferralTreeNode) {
    return node.type === "company" ? node.company.name : node.branch.name
}
