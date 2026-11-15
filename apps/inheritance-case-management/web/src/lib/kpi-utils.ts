export interface KPIData {
    total: number
    ongoing: number
    deadlineSoon: number
    deadlineOverdue: number
    completed: number
    addedThisMonth: number
    completedThisMonth: number
    /** 案件のある年度（絞り込みに関係なく全件から。一覧の年度の選択肢に使う） */
    fiscalYears: number[]
}

/** KPI のうち件数の項目 */
export type KPICountKey = Exclude<keyof KPIData, 'fiscalYears'>
