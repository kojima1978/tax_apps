import { LayoutDashboard, TrendingUp, Users, BookOpen, ClipboardList, type LucideIcon } from 'lucide-react';

// 案件詳細画面のセクション定義。サイドバーのメニューと本文パネルを同じ定義から生成する。
// 並び順はそのまま画面の並び＝印刷の並びになるので、印刷ページの順序(utils/printPages.ts)と揃えること。
export type CaseSectionKey = 'summary' | 'charts' | 'beneficiary' | 'overview' | 'analysis';

export interface CaseSectionDef {
  key: CaseSectionKey;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const CASE_SECTIONS: CaseSectionDef[] = [
  { key: 'summary', label: 'サマリー・証券一覧', description: '加入状況の全体像と証券の一覧', icon: LayoutDashboard },
  { key: 'charts', label: '保障・コストの推移', description: '死亡保障と月額負担の年齢推移', icon: TrendingUp },
  { key: 'beneficiary', label: '受取人別の保障', description: '受取人ごとの死亡保障の合計と推移', icon: Users },
  { key: 'overview', label: '保険種類の説明・診断', description: '加入中の保険種類の解説とポートフォリオ診断', icon: BookOpen },
  { key: 'analysis', label: '個別分析', description: '証券ごとの詳細分析とコメント', icon: ClipboardList },
];

// 非表示のセクションもDOMには残す(印刷は全ページを1つの文書として出力するため)。
// 表示切替はクラスだけで行い、実際の display 制御は globals.css 側に集約している。
export const sectionPanelClassName = (
  sectionKey: CaseSectionKey,
  activeKey: CaseSectionKey,
  baseClassName?: string,
): string =>
  [baseClassName, 'section-panel', sectionKey === activeKey ? 'is-active' : 'is-hidden']
    .filter(Boolean)
    .join(' ');
