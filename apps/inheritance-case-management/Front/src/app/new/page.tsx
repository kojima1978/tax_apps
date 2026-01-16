"use client"

import { EditCaseForm } from "../[id]/edit-case-form"
import { Suspense } from "react"
import { InheritanceCase } from "@/lib/mock-data"
import { Button } from "@/components/ui/Button"
import Link from "next/link"

const emptyCase: InheritanceCase = {
    id: "", // Will be generated
    deceasedName: "",
    dateOfDeath: new Date().toISOString().split("T")[0],
    status: "未着手",
    taxAmount: 0,
    assignee: "",
    feeAmount: 0,
    fiscalYear: new Date().getFullYear(),
    referrer: "",
    estimateAmount: 0,
    propertyValue: 0,
    progress: [
        { id: "step-1", name: "初回連絡", date: null },
        { id: "step-2", name: "初回面談", date: null },
        { id: "step-3", name: "2回目訪問", date: null },
        { id: "step-8", name: "最終チェック完了", date: null },
        { id: "step-4", name: "遺産分割", date: null },
        { id: "step-5", name: "申告", date: null },
        { id: "step-6", name: "請求", date: null },
        { id: "step-7", name: "入金確認", date: null },
    ],
    contacts: [{ name: "", phone: "", email: "" }],
}

export default function NewCasePage() {
    return (
        <div className="container mx-auto py-10 max-w-5xl">
            <div className="mb-6">
                <Link href="/">
                    <Button variant="outline">
                        一覧に戻る
                    </Button>
                </Link>
            </div>

            <h1 className="text-2xl font-bold mb-6">新規案件登録</h1>

            <div className="p-6">
                <Suspense fallback={<div>Loading...</div>}>
                    <EditCaseForm initialData={emptyCase} isCreateMode={true} />
                </Suspense>
            </div>
        </div>
    )
}
