import type { InheritanceCase } from "@/types/shared"
import { MILESTONE_DATES, isAccepted } from "@/types/constants"
import { getNeedsConfirmedFee } from "./edit-case-form-utils"

export interface MissingCaseInput { label: string; sectionKey: string; targetId: string; field?: string; priority?: "action" | "review" }

export function getMissingCaseInputs(data: InheritanceCase): MissingCaseInput[] {
    const missing: MissingCaseInput[] = []
    const basic = (label: string, field: string) => missing.push({ label, field, sectionKey: "basicInfo", targetId: "case-basic-info" })
    if (!data.deceasedName.trim()) basic("被相続人氏名未入力", "deceasedName")
    if (!data.dateOfDeath) basic("相続開始日未入力", "dateOfDeath")
    if (!data.assigneeId && data.status !== "見送り") basic("担当者未設定", "assigneeId")
    if (getNeedsConfirmedFee(data)) missing.push({ label: "報酬額未入力", field: "feeAmount", sectionKey: "financial", targetId: "case-financial" })
    for (const milestone of MILESTONE_DATES) {
        if (milestone.statuses.includes(data.status) && !data[milestone.field]) {
            missing.push({ label: `${milestone.label}日未入力`, field: milestone.field, sectionKey: "progress", targetId: "case-progress" })
        }
    }
    if (isAccepted(data.status) && !data.heirs?.length) missing.push({ label: "相続人未登録", sectionKey: "heirs", targetId: "case-heirs", priority: "review" })
    if (data.expenses?.some(e => !e.description.trim() && e.amount > 0)) missing.push({ label: "立替金の内容未入力", sectionKey: "expenses", targetId: "case-expenses" })
    return missing
}

const SECTION_FIELDS: Record<string, readonly (keyof InheritanceCase)[]> = {
    basicInfo: ["deceasedName", "deceasedNameKana", "dateOfDeath", "fiscalYear", "assigneeId", "internalReferrerId", "referrerId", "summary"],
    progress: ["status", "isUndivided", "caseAddedDate", "caseCompletedDate", "billedDate", "paidDate", "progress"],
    financial: ["propertyValue", "taxAmount", "estimateAmount", "feeAmount", "referralFeeRate", "referralFeeAmount", "estimateReferralFeeAmount", "isReferralFeeManual", "isEstimateReferralFeeManual", "landRosenkaCount", "landBairitsuCount", "unlistedStockCount", "feeCalculationHeirCount", "discountAmount", "feeCalcSnapshot", "specialAdditions"],
    expenses: ["expenses"], heirs: ["heirs"], relatedParties: ["relatedParties"], memo: ["memo"],
}

export function getChangedCaseSections(current: InheritanceCase, baseline: InheritanceCase): string[] {
    return Object.entries(SECTION_FIELDS).filter(([, fields]) => fields.some(field => JSON.stringify(current[field]) !== JSON.stringify(baseline[field]))).map(([section]) => section)
}
