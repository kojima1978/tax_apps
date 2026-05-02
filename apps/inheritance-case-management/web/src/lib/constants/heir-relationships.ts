export const HEIR_RELATIONSHIPS = [
  { label: '配偶者', sort: 10 },
  { label: '長男', sort: 20 },
  { label: '長女', sort: 21 },
  { label: '次男', sort: 30 },
  { label: '次女', sort: 31 },
  { label: '三男', sort: 40 },
  { label: '三女', sort: 41 },
  { label: '父', sort: 60 },
  { label: '母', sort: 61 },
  { label: '兄', sort: 70 },
  { label: '弟', sort: 71 },
  { label: '姉', sort: 72 },
  { label: '妹', sort: 73 },
  { label: '孫', sort: 80 },
  { label: '養子', sort: 90 },
  { label: '代襲相続人', sort: 95 },
  { label: '受遺者', sort: 100 },
] as const;

export const HEIR_RELATIONSHIP_LABELS = HEIR_RELATIONSHIPS.map(r => r.label);

export const RELATIONSHIP_DEFAULT_SORT = 999;

export function relationshipSortFor(label: string): number {
  return HEIR_RELATIONSHIPS.find(r => r.label === label)?.sort ?? RELATIONSHIP_DEFAULT_SORT;
}
