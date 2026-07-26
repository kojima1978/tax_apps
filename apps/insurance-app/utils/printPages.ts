import type { Policy } from '@/types';

// 印刷は「表紙 → サマリー → グラフ → 受取人別 → 種類説明 → 証券ごと」の固定順で1つの文書として出力する。
// ページ番号を各コンポーネントにハードコードすると条件分岐(受取人ページの有無など)のたびにズレるため、
// 出力されるページのキー列をここで一度だけ組み立て、番号は「並び順」から導出する。
export type PrintPageKey =
  | 'cover'
  | 'summary'
  | 'charts'
  | 'beneficiary'
  | 'overview'
  | `policy:${string}`;

export const policyPrintPageKey = (policyId: string): PrintPageKey => `policy:${policyId}`;

interface PrintPageSource {
  /** 保障・コストのグラフページを出力するか(現在年齢が必要) */
  hasChartsPage: boolean;
  /** 分析ページ群(種類説明・証券ごと)を出力するか */
  hasAnalysisPages: boolean;
  /** 受取人別ページを出力するか */
  hasBeneficiaryPage: boolean;
  policies: Policy[];
}

export const buildPrintPageKeys = ({
  hasChartsPage,
  hasAnalysisPages,
  hasBeneficiaryPage,
  policies,
}: PrintPageSource): PrintPageKey[] => [
  'cover',
  'summary',
  ...(hasChartsPage ? (['charts'] as PrintPageKey[]) : []),
  ...(hasAnalysisPages
    ? [
        ...(hasBeneficiaryPage ? (['beneficiary'] as PrintPageKey[]) : []),
        'overview' as PrintPageKey,
        ...policies.map(policy => policyPrintPageKey(policy.id)),
      ]
    : []),
];
