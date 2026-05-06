import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import type { Company, MergeResult } from "@/types/shared"

interface CompanyMergeModalProps {
    companies: Company[]
    mergeSource: Company | null
    mergeTargetId: number | null
    merging: boolean
    mergeResult: MergeResult | null
    onTargetChange: (targetId: number | null) => void
    onMerge: () => void
    onClose: () => void
}

export function CompanyMergeModal({
    companies,
    mergeSource,
    mergeTargetId,
    merging,
    mergeResult,
    onTargetChange,
    onMerge,
    onClose,
}: CompanyMergeModalProps) {
    return (
        <Modal isOpen={!!mergeSource} onClose={onClose} title="会社のマージ">
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
                        <Button onClick={onClose}>閉じる</Button>
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
                            onChange={e => onTargetChange(e.target.value ? Number(e.target.value) : null)}
                            className="w-full border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            <option value="">選択してください</option>
                            {companies.filter(company => company.id !== mergeSource?.id).map(company => (
                                <option key={company.id} value={company.id}>{company.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={onClose} disabled={merging}>キャンセル</Button>
                        <Button onClick={onMerge} disabled={!mergeTargetId || merging}>
                            {merging ? "処理中..." : "マージ実行"}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    )
}
