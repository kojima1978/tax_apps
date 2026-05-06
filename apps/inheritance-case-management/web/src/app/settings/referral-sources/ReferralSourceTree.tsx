import { Building2, Check, ChevronDown, ChevronRight, GitBranch, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import type { Company, CompanyBranch } from "@/types/shared"
import { getBranchesFor, isSameReferralNode, type ReferralTreeNode } from "./referral-source-utils"
import { EditableName, NodeActions } from "./ReferralTreeControls"

interface ReferralSourceTreeProps {
    companies: Company[]
    branches: CompanyBranch[]
    expanded: Set<number>
    selected: ReferralTreeNode | null
    addingCompany: boolean
    newCompanyName: string
    addingBranchFor: number | null
    newBranchName: string
    editingNode: ReferralTreeNode | null
    editName: string
    isCompanyReferrer: (companyId: number) => boolean
    isBranchReferrer: (companyId: number, branchId: number) => boolean
    onToggleExpand: (companyId: number) => void
    onSelect: (node: ReferralTreeNode) => void
    onStartAddingCompany: () => void
    onCancelAddingCompany: () => void
    onNewCompanyNameChange: (value: string) => void
    onAddCompany: () => void
    onStartAddingBranch: (companyId: number) => void
    onCancelAddingBranch: () => void
    onNewBranchNameChange: (value: string) => void
    onAddBranch: (companyId: number) => void
    onStartEdit: (node: ReferralTreeNode) => void
    onEditNameChange: (value: string) => void
    onSaveEdit: () => void
    onCancelEdit: () => void
    onDelete: (node: ReferralTreeNode) => void
}

export function ReferralSourceTree({
    companies,
    branches,
    expanded,
    selected,
    addingCompany,
    newCompanyName,
    addingBranchFor,
    newBranchName,
    editingNode,
    editName,
    isCompanyReferrer,
    isBranchReferrer,
    onToggleExpand,
    onSelect,
    onStartAddingCompany,
    onCancelAddingCompany,
    onNewCompanyNameChange,
    onAddCompany,
    onStartAddingBranch,
    onCancelAddingBranch,
    onNewBranchNameChange,
    onAddBranch,
    onStartEdit,
    onEditNameChange,
    onSaveEdit,
    onCancelEdit,
    onDelete,
}: ReferralSourceTreeProps) {
    return (
        <div className="border rounded-lg bg-card p-4 space-y-1 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-muted-foreground">会社・部門ツリー</span>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={onStartAddingCompany}
                >
                    <Plus className="h-3 w-3 mr-1" />会社追加
                </Button>
            </div>

            {addingCompany && (
                <div className="flex items-center gap-1 mb-2 pl-2">
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Input
                        value={newCompanyName}
                        onChange={e => onNewCompanyNameChange(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && onAddCompany()}
                        placeholder="会社名"
                        className="h-8 text-sm"
                        autoFocus
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-black/70" onClick={onAddCompany}>
                        <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancelAddingCompany}>
                        <X className="h-3.5 w-3.5" />
                    </Button>
                </div>
            )}

            {companies.length === 0 && !addingCompany && (
                <p className="text-sm text-muted-foreground pl-2">会社が登録されていません</p>
            )}

            {companies.map(company => (
                <CompanyTreeNode
                    key={company.id}
                    company={company}
                    branches={getBranchesFor(branches, company.id)}
                    isExpanded={expanded.has(company.id)}
                    selected={selected}
                    editingNode={editingNode}
                    editName={editName}
                    addingBranchFor={addingBranchFor}
                    newBranchName={newBranchName}
                    isCompanyReferrer={isCompanyReferrer(company.id)}
                    branchRefCount={getBranchesFor(branches, company.id).filter(branch => isBranchReferrer(company.id, branch.id)).length}
                    isBranchReferrer={(branchId) => isBranchReferrer(company.id, branchId)}
                    onToggleExpand={() => onToggleExpand(company.id)}
                    onSelect={onSelect}
                    onStartEdit={onStartEdit}
                    onEditNameChange={onEditNameChange}
                    onSaveEdit={onSaveEdit}
                    onCancelEdit={onCancelEdit}
                    onDelete={onDelete}
                    onStartAddingBranch={() => onStartAddingBranch(company.id)}
                    onCancelAddingBranch={onCancelAddingBranch}
                    onNewBranchNameChange={onNewBranchNameChange}
                    onAddBranch={() => onAddBranch(company.id)}
                />
            ))}
        </div>
    )
}

function CompanyTreeNode({
    company,
    branches,
    isExpanded,
    selected,
    editingNode,
    editName,
    addingBranchFor,
    newBranchName,
    isCompanyReferrer,
    branchRefCount,
    isBranchReferrer,
    onToggleExpand,
    onSelect,
    onStartEdit,
    onEditNameChange,
    onSaveEdit,
    onCancelEdit,
    onDelete,
    onStartAddingBranch,
    onCancelAddingBranch,
    onNewBranchNameChange,
    onAddBranch,
}: {
    company: Company
    branches: CompanyBranch[]
    isExpanded: boolean
    selected: ReferralTreeNode | null
    editingNode: ReferralTreeNode | null
    editName: string
    addingBranchFor: number | null
    newBranchName: string
    isCompanyReferrer: boolean
    branchRefCount: number
    isBranchReferrer: (branchId: number) => boolean
    onToggleExpand: () => void
    onSelect: (node: ReferralTreeNode) => void
    onStartEdit: (node: ReferralTreeNode) => void
    onEditNameChange: (value: string) => void
    onSaveEdit: () => void
    onCancelEdit: () => void
    onDelete: (node: ReferralTreeNode) => void
    onStartAddingBranch: () => void
    onCancelAddingBranch: () => void
    onNewBranchNameChange: (value: string) => void
    onAddBranch: () => void
}) {
    const companyNode: ReferralTreeNode = { type: "company", company }
    const isEditingCompany = isSameReferralNode(editingNode, companyNode)

    return (
        <div>
            <div
                className={`group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                    isSameReferralNode(selected, companyNode) ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                }`}
                onClick={() => {
                    onSelect(companyNode)
                    if (!isExpanded) onToggleExpand()
                }}
            >
                <button
                    className="shrink-0 p-0.5 hover:bg-muted rounded"
                    onClick={e => {
                        e.stopPropagation()
                        onToggleExpand()
                    }}
                >
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
                <Building2 className="h-4 w-4 text-black/70 shrink-0" />

                {isEditingCompany ? (
                    <EditableName value={editName} onChange={onEditNameChange} onSave={onSaveEdit} onCancel={onCancelEdit} />
                ) : (
                    <>
                        <span className="text-sm font-medium truncate flex-1">{company.name}</span>
                        <div className="flex items-center gap-1">
                            {isCompanyReferrer && (
                                <span className="text-[10px] bg-white text-black border border-black/10 px-1.5 py-0.5 rounded-full font-medium">会社</span>
                            )}
                            {branchRefCount > 0 && (
                                <span className="text-[10px] bg-white text-black border border-black/10 px-1.5 py-0.5 rounded-full font-medium">{branchRefCount}部門</span>
                            )}
                        </div>
                        <NodeActions node={companyNode} onStartEdit={onStartEdit} onDelete={onDelete} />
                    </>
                )}
            </div>

            {isExpanded && (
                <div className="ml-5 border-l pl-2 space-y-0.5 mt-0.5">
                    {branches.map(branch => (
                        <BranchTreeNode
                            key={branch.id}
                            branch={branch}
                            company={company}
                            selected={selected}
                            editingNode={editingNode}
                            editName={editName}
                            isBranchReferrer={isBranchReferrer(branch.id)}
                            onSelect={onSelect}
                            onStartEdit={onStartEdit}
                            onEditNameChange={onEditNameChange}
                            onSaveEdit={onSaveEdit}
                            onCancelEdit={onCancelEdit}
                            onDelete={onDelete}
                        />
                    ))}

                    {addingBranchFor === company.id ? (
                        <div className="flex items-center gap-1 px-2 py-1">
                            <GitBranch className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <Input
                                value={newBranchName}
                                onChange={e => onNewBranchNameChange(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && onAddBranch()}
                                placeholder="部門名"
                                className="h-7 text-sm flex-1"
                                autoFocus
                            />
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-black/70" onClick={onAddBranch}>
                                <Check className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancelAddingBranch}>
                                <X className="h-3 w-3" />
                            </Button>
                        </div>
                    ) : (
                        <button
                            className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full rounded-md hover:bg-muted/50"
                            onClick={onStartAddingBranch}
                        >
                            <Plus className="h-3 w-3" />
                            部門を追加
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

function BranchTreeNode({
    branch,
    company,
    selected,
    editingNode,
    editName,
    isBranchReferrer,
    onSelect,
    onStartEdit,
    onEditNameChange,
    onSaveEdit,
    onCancelEdit,
    onDelete,
}: {
    branch: CompanyBranch
    company: Company
    selected: ReferralTreeNode | null
    editingNode: ReferralTreeNode | null
    editName: string
    isBranchReferrer: boolean
    onSelect: (node: ReferralTreeNode) => void
    onStartEdit: (node: ReferralTreeNode) => void
    onEditNameChange: (value: string) => void
    onSaveEdit: () => void
    onCancelEdit: () => void
    onDelete: (node: ReferralTreeNode) => void
}) {
    const branchNode: ReferralTreeNode = { type: "branch", branch, company }

    return (
        <div
            className={`group flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition-colors ${
                isSameReferralNode(selected, branchNode) ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
            }`}
            onClick={() => onSelect(branchNode)}
        >
            <GitBranch className="h-3.5 w-3.5 text-black/70 shrink-0" />

            {isSameReferralNode(editingNode, branchNode) ? (
                <EditableName value={editName} onChange={onEditNameChange} onSave={onSaveEdit} onCancel={onCancelEdit} />
            ) : (
                <>
                    <span className="text-sm truncate flex-1">{branch.name}</span>
                    {isBranchReferrer && <Check className="h-3.5 w-3.5 text-black/70 shrink-0" />}
                    <NodeActions node={branchNode} onStartEdit={onStartEdit} onDelete={onDelete} />
                </>
            )}
        </div>
    )
}
