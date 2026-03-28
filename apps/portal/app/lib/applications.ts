import type { LucideIcon } from 'lucide-react';
import {
  Activity, Banknote, Briefcase, Building, Calculator,
  Clock, CreditCard, FileCheck, FileSpreadsheet, FileText, Gift, Package, Receipt, TrendingUp,
} from 'lucide-react';

export const categories = ['必要書類', '計算・評価', '分析・管理', 'その他'] as const;
export type Category = (typeof categories)[number];

export interface Application {
  title: string;
  description: string;
  url: string;
  icon: LucideIcon;
  category: Category;
}

export const applications: Application[] = [
  { title: '相続税 必要書類', description: '相続税・相続シミュレーション・株価計算に必要な書類をご案内', url: '/inheritance-tax-docs/', icon: FileText, category: '必要書類' },
  { title: '所得税・贈与税 必要書類', description: '所得税・贈与税申告に必要な書類をご案内', url: '/tax-docs/', icon: FileCheck, category: '必要書類' },
  { title: '相続税計算', description: '相続税の概算計算', url: '/inheritance-tax-app/', icon: Calculator, category: '計算・評価' },
  { title: '贈与税計算', description: '贈与税計算・早見表・不動産取得税', url: '/gift-tax-simulator/', icon: Gift, category: '計算・評価' },
  { title: '医療法人株式評価', description: '医療法人の株式評価システム', url: '/medical/', icon: Activity, category: '計算・評価' },
  { title: '非上場株式評価', description: '非上場株式の評価システム', url: '/shares/', icon: TrendingUp, category: '計算・評価' },
  { title: '退職金税額計算', description: '退職金の所得税・住民税を計算', url: '/retirement-tax-calc/', icon: CreditCard, category: '計算・評価' },
  { title: '減価償却ツール', description: '耐用年数・簿価・期間償却を計算', url: '/depreciation-calc/', icon: Clock, category: '計算・評価' },
  { title: '減価償却資産評価', description: '相続税の減価償却資産を一括評価', url: '/asset-valuation/', icon: Package, category: '計算・評価' },
  { title: '給与手取り計算', description: '給与・賞与の手取り額を計算', url: '/salary-calc/', icon: Banknote, category: '計算・評価' },
  { title: '株式評価明細書', description: '取引相場のない株式の評価明細書', url: '/stock-valuation-form/', icon: FileSpreadsheet, category: '計算・評価' },
  { title: '預貯金分析', description: '預金移動の分析ツール', url: '/bank-analyzer/', icon: Building, category: '分析・管理' },
  { title: '案件管理', description: '相続税案件の進捗管理', url: '/itcm/', icon: Briefcase, category: '分析・管理' },
  { title: '料金表', description: '報酬についてのご案内', url: '/fee-table/', icon: Receipt, category: 'その他' },
];
