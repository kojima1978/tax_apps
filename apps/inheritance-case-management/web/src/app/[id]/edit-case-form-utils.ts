import type { InheritanceCase } from "@/types/shared"
import { toExpenses, toHeirInputs, toProgressSteps, toRelatedPartyInputs, toSpecialAdditions } from "@/lib/case-converters"
import { COMPLETED_STATUSES } from "@/types/constants"
import { DEFAULT_CASE_DETAIL_TAB, getCaseDetailTabHref, type CaseDetailTabId } from "./case-detail-tabs"

const NUMERIC_FIELDS = ["taxAmount", "feeAmount", "fiscalYear"] as const
const FK_FIELDS = ["assigneeId", "internalReferrerId", "referrerId"] as const

/** マスタ画面から戻るときの行き先。案件詳細は今見ているタブへ戻す */
export function getCaseReturnPath(formData: InheritanceCase, isCreateMode: boolean, tab: CaseDetailTabId = DEFAULT_CASE_DETAIL_TAB): string {
    return isCreateMode ? "/new" : getCaseDetailTabHref(formData.id, tab)
}

export function parseCaseFieldValue(name: string, value: string) {
    if ((NUMERIC_FIELDS as readonly string[]).includes(name)) return Number(value)
    if ((FK_FIELDS as readonly string[]).includes(name)) return value ? Number(value) : null
    return value
}

export function shouldPromptForConfirmedFee(name: string, value: string, formData: InheritanceCase): boolean {
    const completedStatusSelected = name === "status" && (COMPLETED_STATUSES as readonly string[]).includes(value)
    const completedDateEntered = name === "caseCompletedDate" && !!value
    return (completedStatusSelected || completedDateEntered) && !formData.feeAmount
}

export function hasInvalidSpecialAddition(formData: InheritanceCase): boolean {
    return (formData.specialAdditions || []).some(
        (addition) => !addition.description.trim() && (addition.amount || 0) > 0,
    )
}

export function hasInvalidExpense(formData: InheritanceCase): boolean {
    return (formData.expenses || []).some(
        (expense) => !expense.description.trim()
            && ((expense.amount || 0) > 0 || Boolean(expense.memo?.trim())),
    )
}

export function getNeedsConfirmedFee(formData: InheritanceCase): boolean {
    return ((COMPLETED_STATUSES as readonly string[]).includes(formData.status) || !!formData.caseCompletedDate)
        && !formData.feeAmount
}

export function calculateNetRevenue(formData: InheritanceCase): number {
    return (formData.feeAmount || 0) - (formData.referralFeeAmount || 0)
}

export function calculateEstimateNetRevenue(formData: InheritanceCase): number {
    const base = formData.estimateAmount || 0
    const referral = formData.estimateReferralFeeAmount ?? Math.floor(base * ((formData.referralFeeRate || 0) / 100))
    return base - referral
}

export function getCaseApiPayload(formData: InheritanceCase) {
    const heirs = formData.heirs ? toHeirInputs(formData.heirs) : undefined
    const relatedParties = formData.relatedParties ? toRelatedPartyInputs(formData.relatedParties) : undefined
    const progress = formData.progress ? toProgressSteps(formData.progress) : undefined
    const expenses = formData.expenses ? toExpenses(formData.expenses).filter(e => e.description.trim() !== "") : undefined
    const specialAdditions = formData.specialAdditions
        ? toSpecialAdditions(formData.specialAdditions).filter(addition => addition.description.trim() !== "")
        : undefined

    return {
        deceasedName: formData.deceasedName,
        deceasedNameKana: formData.deceasedNameKana || "",
        dateOfDeath: formData.dateOfDeath,
        fiscalYear: formData.fiscalYear,
        status: formData.status,
        isUndivided: formData.isUndivided ?? false,
        taxAmount: formData.taxAmount,
        feeAmount: formData.feeAmount,
        estimateAmount: formData.estimateAmount,
        propertyValue: formData.propertyValue,
        referralFeeRate: formData.referralFeeRate,
        referralFeeAmount: formData.referralFeeAmount,
        estimateReferralFeeAmount: formData.estimateReferralFeeAmount,
        isReferralFeeManual: formData.isReferralFeeManual ?? false,
        isEstimateReferralFeeManual: formData.isEstimateReferralFeeManual ?? false,
        landRosenkaCount: formData.landRosenkaCount || 0,
        landBairitsuCount: formData.landBairitsuCount || 0,
        unlistedStockCount: formData.unlistedStockCount || 0,
        feeCalculationHeirCount: formData.feeCalculationHeirCount || 0,
        discountAmount: formData.discountAmount || 0,
        feeCalcSnapshot: formData.feeCalcSnapshot ?? null,
        summary: formData.summary || null,
        memo: formData.memo || null,
        caseAddedDate: formData.caseAddedDate || null,
        caseCompletedDate: formData.caseCompletedDate || null,
        billedDate: formData.billedDate || null,
        paidDate: formData.paidDate || null,
        assigneeId: formData.assigneeId || null,
        internalReferrerId: formData.internalReferrerId || null,
        referrerId: formData.referrerId || null,
        heirs,
        relatedParties,
        progress,
        expenses,
        specialAdditions,
    }
}
