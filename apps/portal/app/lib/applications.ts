import type { LucideIcon } from 'lucide-react';
import {
  Activity, Briefcase, Building, Calculator, ClipboardList,
  CreditCard, FileCheck, FileText, Gift, Receipt, TrendingUp,
} from 'lucide-react';

export interface Application {
  title: string;
  description: string;
  url: string;
  icon: LucideIcon;
}

export const applications: Application[] = [
  // 必要書類
  { title: '相続税 必要書類', description: '相続税申告に必要な書類をご案内', url: '/inheritance-tax-docs/', icon: FileText },
  { title: '贈与税 必要書類', description: '贈与税申告に必要な書類をご案内', url: '/gift-tax-docs/', icon: ClipboardList },
  { title: '確定申告 必要書類', description: '確定申告に必要な書類をご案内', url: '/tax-docs/', icon: FileCheck },
  // 計算・評価
  { title: '相続税計算', description: '相続税の早見表', url: '/inheritance-tax-app/', icon: Calculator },
  { title: '贈与税計算', description: '贈与税計算・早見表・不動産取得税', url: '/gift-tax-simulator/', icon: Gift },
  { title: '医療法人株式評価', description: '医療法人の株式評価システム', url: '/medical/', icon: Activity },
  { title: '非上場株式評価', description: '非上場株式の評価システム', url: '/shares/', icon: TrendingUp },
  { title: '退職金税額計算', description: '退職金の所得税・住民税を計算', url: '/retirement-tax-calc/', icon: CreditCard },
  // 分析・管理
  { title: '預貯金分析', description: '預金移動の分析ツール', url: '/bank-analyzer/', icon: Building },
  { title: '案件管理', description: '相続税案件の進捗管理', url: '/itcm/', icon: Briefcase },
  // その他
  { title: '料金表', description: '報酬についてのご案内', url: '/fee-table/', icon: Receipt },
];
