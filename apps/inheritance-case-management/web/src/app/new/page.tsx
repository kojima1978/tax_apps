"use client"

import { EditCaseForm } from "../[id]/edit-case-form"
import { Suspense } from "react"
import type { InheritanceCase } from "@/types/shared"
import { DEFAULT_PROGRESS_STEPS } from "@/lib/progress-utils"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

const emptyCase: InheritanceCase = {
    id: 0,
    deceasedName: "",
    dateOfDeath: new Date().toISOString().split("T")[0],
    status: "未着手",
    taxAmount: 0,
    assigneeId: null,
    feeAmount: 0,
    fiscalYear: new Date().getFullYear(),
    internalReferrerId: null,
    referrerId: null,
    estimateAmount: 0,
    propertyValue: 0,
    progress: DEFAULT_PROGRESS_STEPS.map((step, i) => ({
        id: 0, stepId: step.id, name: step.name, sortOrder: i, date: null,
    })),
    contacts: [{ id: 0, sortOrder: 0, name: "", phone: "", postalCode: "", address: "", memo: "" }],
}

export default function NewCasePage() {
    return (
        <div className="container mx-auto py-10 max-w-5xl px-4">
            <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
                <Link href="/" className="hover:text-foreground transition-colors">案件一覧</Link>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-foreground font-medium">新規案件登録</span>
            </nav>

            <div className="bg-card text-card-foreground rounded-lg border shadow-sm p-6">
                <div className="mb-8 border-b pb-4">
                    <h1 className="text-2xl font-bold tracking-tight">新規案件登録</h1>
                    <p className="text-muted-foreground">基本情報を入力して案件を登録します</p>
                </div>

                <Suspense fallback={<div>Loading...</div>}>
                    <EditCaseForm initialData={emptyCase} isCreateMode={true} />
                </Suspense>
            </div>
        </div>
    )
}
