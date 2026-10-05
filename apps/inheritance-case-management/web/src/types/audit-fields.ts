// 変更履歴（AuditLog）のフィールド定義。
// サーバ（lib/services/audit-service.ts）とクライアント（app/[id]/AuditLogSection.tsx）の
// 両方から参照するため、Prisma に依存しないここへ1本化している。
// 以前は同じ表を2箇所に持っていて、クライアント側だけ deceasedNameKana が欠けていた。

export interface FieldChange {
    field: string
    old: unknown
    new: unknown
}

/** 値の種類。表示の整形を分岐させるために使う */
export type AuditFieldKind =
    | 'text'      // そのまま文字列
    | 'count'     // 桁区切りを付けない整数（年度・件数など）
    | 'currency'  // 桁区切り + 円
    | 'percent'   // パーセント
    | 'boolean'   // あり / なし
    | 'date'      // 和暦
    | 'assignee'  // 担当者マスタのID
    | 'referrer'  // 紹介元マスタのID
    | 'relation'  // 子レコードの件数

interface AuditFieldDef {
    label: string
    kind: AuditFieldKind
}

export const AUDIT_FIELDS: Record<string, AuditFieldDef> = {
    deceasedName: { label: '被相続人氏名', kind: 'text' },
    deceasedNameKana: { label: '被相続人フリガナ', kind: 'text' },
    dateOfDeath: { label: '死亡日', kind: 'date' },
    status: { label: 'ステータス', kind: 'text' },
    isUndivided: { label: '遺産未分割', kind: 'boolean' },
    taxAmount: { label: '申告納税額', kind: 'currency' },
    feeAmount: { label: '報酬額', kind: 'currency' },
    estimateAmount: { label: '見積額', kind: 'currency' },
    propertyValue: { label: '遺産総額', kind: 'currency' },
    referralFeeRate: { label: '紹介料率', kind: 'percent' },
    referralFeeAmount: { label: '紹介料額', kind: 'currency' },
    estimateReferralFeeAmount: { label: '見積紹介料額', kind: 'currency' },
    isReferralFeeManual: { label: '請求書紹介料の手動設定', kind: 'boolean' },
    isEstimateReferralFeeManual: { label: '見積書紹介料の手動設定', kind: 'boolean' },
    landRosenkaCount: { label: '土地数（路線価）', kind: 'count' },
    landBairitsuCount: { label: '土地数（倍率）', kind: 'count' },
    unlistedStockCount: { label: '非上場株式数', kind: 'count' },
    feeCalculationHeirCount: { label: '報酬計算上の相続人数', kind: 'count' },
    discountAmount: { label: '値引額', kind: 'currency' },
    summary: { label: '特記事項', kind: 'text' },
    memo: { label: 'メモ', kind: 'text' },
    caseAddedDate: { label: '受託日', kind: 'date' },
    caseCompletedDate: { label: '申告日', kind: 'date' },
    billedDate: { label: '請求日', kind: 'date' },
    paidDate: { label: '入金日', kind: 'date' },
    assigneeId: { label: '担当者', kind: 'assignee' },
    internalReferrerId: { label: '社内紹介者', kind: 'assignee' },
    referrerId: { label: '紹介者', kind: 'referrer' },
    fiscalYear: { label: '年度', kind: 'count' },
    // 旧形式の履歴にだけ残るキー。現在は *Id 側を記録するので新しくは積まれないが、
    // 過去の行が英語のフィールド名のまま残るのでラベルだけ与えておく。
    assignee: { label: '担当者', kind: 'text' },
    internalReferrer: { label: '社内紹介者', kind: 'text' },
    referrer: { label: '紹介者', kind: 'text' },

    // 子レコード（件数だけを記録する）
    heirs: { label: '相続人', kind: 'relation' },
    relatedParties: { label: '関係者', kind: 'relation' },
    progress: { label: '進捗管理', kind: 'relation' },
    expenses: { label: '立替金', kind: 'relation' },
    specialAdditions: { label: '特別業務報酬', kind: 'relation' },
}

export function getAuditFieldLabel(field: string): string {
    return AUDIT_FIELDS[field]?.label || field
}

export function getAuditFieldKind(field: string): AuditFieldKind {
    return AUDIT_FIELDS[field]?.kind || 'text'
}

/** 変更履歴に出さないフィールド（内部管理用・差分に意味が無いもの） */
export const AUDIT_SKIP_FIELDS = new Set([
    'updatedAt', 'createdAt', 'updatedBy', 'createdBy', 'feeCalcSnapshot',
])

/** 件数の増減だけを記録する子レコード */
export const AUDIT_RELATION_FIELDS = Object.keys(AUDIT_FIELDS)
    .filter((field) => AUDIT_FIELDS[field].kind === 'relation')

/**
 * 子レコードを比較するときに無視するキー。
 * 更新は deleteMany + create で作り直すので、id と日時は毎回変わる。
 */
export const AUDIT_VOLATILE_KEYS = new Set(['id', 'caseId', 'createdAt', 'updatedAt'])
