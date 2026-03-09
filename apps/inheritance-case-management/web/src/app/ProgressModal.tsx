"use client"

import { useState } from "react"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Modal } from "@/components/ui/Modal"
import type { InheritanceCase } from "@/types/shared"
import Link from "next/link"

export function ProgressModalButton({ caseData }: { caseData: InheritanceCase }) {
    const [showModal, setShowModal] = useState(false)

    return (
        <>
            <Button
                variant="ghost"
                className="h-8 w-8 p-0"
                onClick={() => setShowModal(true)}
            >
                <span className="sr-only">メニューを開く</span>
                <MoreHorizontal className="h-4 w-4" />
            </Button>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={`${caseData.deceasedName} 様 - 進捗確認`}
            >
                <div className="space-y-4">
                    <div className="text-sm text-muted-foreground mb-4">
                        ID: {caseData.id} | 相続開始日: {caseData.dateOfDeath}
                    </div>

                    <div className="border rounded-md divide-y">
                        <div className="grid grid-cols-12 bg-muted/50 p-2 text-xs font-semibold">
                            <div className="col-span-4">工程</div>
                            <div className="col-span-4">完了日</div>
                            <div className="col-span-4">備考</div>
                        </div>
                        {caseData.progress && caseData.progress.length > 0 ? (
                            caseData.progress.map((step) => (
                                <div key={step.id} className="grid grid-cols-12 p-2 text-sm items-center">
                                    <div className="col-span-4 font-medium">{step.name}</div>
                                    <div className="col-span-4 text-muted-foreground">
                                        {step.date || "-"}
                                    </div>
                                    <div className="col-span-4 text-xs text-muted-foreground truncate">
                                        {step.memo || "-"}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-muted-foreground text-sm">
                                進捗データがありません
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-4 border-t gap-2">
                        <Button variant="outline" onClick={() => setShowModal(false)}>
                            閉じる
                        </Button>
                        <Link href={`/${caseData.id}`}>
                            <Button variant="outline">
                                詳細を編集
                            </Button>
                        </Link>
                    </div>
                </div>
            </Modal>
        </>
    )
}
