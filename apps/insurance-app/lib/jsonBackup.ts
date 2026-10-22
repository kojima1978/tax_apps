import type { AppState } from '@/types';

export const BULK_JSON_EXPORT_TYPE = 'insurance-app-bulk-backup';
export const BULK_JSON_SCHEMA_VERSION = 1;

export type BackupInsight = {
  type: 'gap' | 'redundancy' | 'recommendation';
  text: string;
  isCustom: boolean;
};

export interface JsonCaseBackup extends AppState {
  caseTitle?: string;
  portfolioInsights?: BackupInsight[];
}

export interface BulkJsonBackup {
  exportType: typeof BULK_JSON_EXPORT_TYPE;
  schemaVersion: number;
  exportedAt: string;
  cases: JsonCaseBackup[];
}

const INSIGHT_TYPES = ['gap', 'redundancy', 'recommendation'] as const;

export function normalizeCaseBackup(raw: unknown): JsonCaseBackup {
  if (!raw || typeof raw !== 'object') throw new Error('JSONデータが不正です');

  const data = raw as Partial<JsonCaseBackup> & { data?: Partial<JsonCaseBackup> };
  const source = data.data && typeof data.data === 'object' ? data.data : data;
  if (!Array.isArray(source.familyMembers)
    || !Array.isArray(source.policies)
    || !source.agency
    || typeof source.agency !== 'object') {
    throw new Error('保険アプリのJSON形式ではありません');
  }

  const portfolioInsights = Array.isArray(source.portfolioInsights)
    ? (source.portfolioInsights as Record<string, unknown>[])
        .filter(insight => insight && typeof insight === 'object'
          && typeof insight.text === 'string'
          && INSIGHT_TYPES.includes(insight.type as typeof INSIGHT_TYPES[number]))
        .map(insight => ({
          type: insight.type as BackupInsight['type'],
          text: insight.text as string,
          isCustom: !!insight.isCustom,
        }))
    : undefined;

  return {
    familyMembers: source.familyMembers,
    policies: source.policies,
    agency: source.agency,
    valuationSettings: source.valuationSettings,
    updatedAt: source.updatedAt,
    caseTitle: typeof source.caseTitle === 'string' && source.caseTitle.trim()
      ? source.caseTitle.trim()
      : undefined,
    portfolioInsights,
  } as JsonCaseBackup;
}

export function getCasesFromJsonBackup(raw: unknown): JsonCaseBackup[] {
  if (raw && typeof raw === 'object') {
    const bundle = raw as Partial<BulkJsonBackup>;
    if (bundle.exportType === BULK_JSON_EXPORT_TYPE) {
      if (!Array.isArray(bundle.cases) || bundle.cases.length === 0) {
        throw new Error('一括JSONにお客様データがありません');
      }
      return bundle.cases.map(normalizeCaseBackup);
    }
  }
  return [normalizeCaseBackup(raw)];
}

export function remapAppStateIds(state: AppState, createId: () => string): AppState {
  const memberIdMap = new Map(state.familyMembers.map(member => [member.id, createId()]));
  return {
    ...state,
    familyMembers: state.familyMembers.map(member => ({
      ...member,
      id: memberIdMap.get(member.id) ?? createId(),
    })),
    policies: state.policies.map(policy => ({
      ...policy,
      id: createId(),
      insuredId: memberIdMap.get(policy.insuredId) ?? policy.insuredId,
      beneficiaryId: policy.beneficiaryId
        ? memberIdMap.get(policy.beneficiaryId) ?? policy.beneficiaryId
        : policy.beneficiaryId,
      beneficiaryAllocations: policy.beneficiaryAllocations?.map(allocation => ({
        ...allocation,
        beneficiaryId: memberIdMap.get(allocation.beneficiaryId) ?? allocation.beneficiaryId,
      })),
      pensionRecipientId: policy.pensionRecipientId
        ? memberIdMap.get(policy.pensionRecipientId) ?? policy.pensionRecipientId
        : policy.pensionRecipientId,
      pensionSuccessorRecipientId: policy.pensionSuccessorRecipientId
        ? memberIdMap.get(policy.pensionSuccessorRecipientId) ?? policy.pensionSuccessorRecipientId
        : policy.pensionSuccessorRecipientId,
    })),
  };
}
