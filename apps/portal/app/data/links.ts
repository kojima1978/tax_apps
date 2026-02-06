/**
 * Portal Application Links
 * ポータルに表示するアプリケーション一覧
 */

export interface AppLink {
  id: string;
  title: string;
  description: string;
  url: string;
  icon: string;
}

export const appLinks: AppLink[] = [
  // 相続税関連
  {
    id: '1',
    title: '相続税計算',
    description: '相続税のシミュレーション計算',
    url: '/inheritance-tax-app/',
    icon: 'Calculator',
  },
  {
    id: '2',
    title: '相続税申告 資料準備ガイド',
    description: '相続税申告に必要な書類をご案内',
    url: '/inheritance-tax-docs/',
    icon: 'FileText',
  },
  {
    id: '3',
    title: '案件管理',
    description: '相続税案件の進捗管理',
    url: '/itcm/',
    icon: 'Briefcase',
  },

  // 贈与税関連
  {
    id: '4',
    title: '贈与税計算シミュレーター',
    description: '贈与税・間接税のシミュレーション',
    url: '/gift-tax-simulator/',
    icon: 'Gift',
  },
  {
    id: '5',
    title: '贈与税申告 必要書類案内',
    description: '贈与税申告に必要な書類をご案内',
    url: '/gift-tax-docs/',
    icon: 'ClipboardList',
  },
  {
    id: '6',
    title: '間接税シミュレーター',
    description: '土地・建物取得時の税金計算',
    url: '/gift-tax-simulator/real-estate',
    icon: 'Home',
  },

  // 株式評価
  {
    id: '7',
    title: '医療法人株式評価',
    description: '医療法人の株式評価システム',
    url: '/medical/',
    icon: 'Activity',
  },
  {
    id: '8',
    title: '非上場株式評価',
    description: '非上場株式の評価システム',
    url: '/shares/',
    icon: 'TrendingUp',
  },

  // 分析・確定申告
  {
    id: '9',
    title: '銀行分析',
    description: '預金移動の分析ツール',
    url: '/bank-analyzer/',
    icon: 'Building',
  },
  {
    id: '10',
    title: '確定申告 必要書類',
    description: '確定申告に必要な書類を確認・管理',
    url: '/tax-docs/',
    icon: 'FileCheck',
  },
];
