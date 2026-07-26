import type { Policy } from '@/types';

// 印刷は「表紙 → 目次 → サマリー → グラフ → 受取人別 → 種類説明 → 証券ごと」の固定順で1つの文書として出力する。
// ページ番号を各コンポーネントにハードコードすると条件分岐(受取人ページの有無など)のたびにズレるため、
// 出力されるページのキー列をここで一度だけ組み立て、番号は「並び順」から導出する。
export type PrintPageKey =
  | 'cover'
  | 'toc'
  | 'summary'
  | 'charts'
  | 'beneficiary'
  | 'overview'
  | `policy:${string}`;

const POLICY_KEY_PREFIX = 'policy:';

export const policyPrintPageKey = (policyId: string): PrintPageKey => `${POLICY_KEY_PREFIX}${policyId}`;

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
}: PrintPageSource): PrintPageKey[] => {
  const body: PrintPageKey[] = [
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

  // 本文が1ページしかない案件で目次だけ挟んでも意味がないので、2ページ以上のときだけ出す
  return ['cover', ...(body.length > 1 ? (['toc'] as PrintPageKey[]) : []), ...body];
};

/** 目次に出す固定ページの見出し。表紙と目次自身は目次に載せない */
const TOC_TITLES: Record<'summary' | 'charts' | 'beneficiary' | 'overview', string> = {
  summary: '保険証券分析・診断ダッシュボード',
  charts: '死亡保障推移 / 将来の月額保険料負担推移',
  beneficiary: '受取人ごとの死亡保障推移',
  overview: '保険種類の総合説明',
};

/** 証券ごとのページをまとめる見出し(ページ番号は範囲表示) */
const POLICY_GROUP_TITLE = '個々の保険の分析';

export interface PrintTocEntry {
  /** Reactのkey兼識別子。証券行は PrintPageKey と同じ値 */
  id: string;
  title: string;
  /** 単一ページなら "3"、証券グループの見出しなら "7〜12" */
  pageLabel: string;
  /** 証券グループ配下の行(インデントして小さく出す) */
  isChild?: boolean;
}

/**
 * ページのキー列から目次の行を組み立てる。
 * 並び順・ページ番号ともに buildPrintPageKeys の結果だけを根拠にするので、
 * ページが増減しても目次と実際のページ番号がズレない。
 */
export const buildPrintTocEntries = (
  pageKeys: PrintPageKey[],
  policies: Policy[],
): PrintTocEntry[] => {
  const policyById = new Map(policies.map(policy => [policy.id, policy]));
  const isPolicyKey = (key: PrintPageKey) => key.startsWith(POLICY_KEY_PREFIX);
  const firstPolicyPage = pageKeys.findIndex(isPolicyKey) + 1;
  const lastPolicyPage = pageKeys.reduce((last, key, index) => (isPolicyKey(key) ? index + 1 : last), 0);

  const entries: PrintTocEntry[] = [];
  pageKeys.forEach((key, index) => {
    const page = index + 1;
    if (key === 'cover' || key === 'toc') return;

    if (!isPolicyKey(key)) {
      entries.push({ id: key, title: TOC_TITLES[key as keyof typeof TOC_TITLES], pageLabel: String(page) });
      return;
    }

    if (page === firstPolicyPage) {
      entries.push({
        id: 'policy-group',
        title: POLICY_GROUP_TITLE,
        pageLabel: firstPolicyPage === lastPolicyPage ? String(firstPolicyPage) : `${firstPolicyPage}〜${lastPolicyPage}`,
      });
    }
    const policy = policyById.get(key.slice(POLICY_KEY_PREFIX.length));
    if (!policy) return;
    entries.push({
      id: key,
      title: `${policy.policyType}　${policy.companyName}`,
      pageLabel: String(page),
      isChild: true,
    });
  });

  return entries;
};
