/** 保有・処分の意向。評価額や税計算からの除外とは独立して管理する。 */
export const propertyPlanOptions = [
  { value: "UNDECIDED", label: "未定" },
  { value: "KEEP", label: "保有・承継" },
  { value: "SELL", label: "売却予定" },
  { value: "DISPOSE", label: "処分予定" },
  { value: "REVIEW", label: "要検討" },
] as const;
export type PropertyPlan = typeof propertyPlanOptions[number]["value"];
export const propertyPlanValues = ["UNDECIDED", "KEEP", "SELL", "DISPOSE", "REVIEW"] as const;
export const normalizePropertyPlan = (value?: string): PropertyPlan => propertyPlanOptions.find((option) => option.value === value)?.value ?? "UNDECIDED";
export const propertyPlanLabel = (value?: string) => propertyPlanOptions.find((option) => option.value === normalizePropertyPlan(value))!.label;
