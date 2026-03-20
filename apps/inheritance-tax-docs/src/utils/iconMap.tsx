import {
  FileText,
  FileCheck,
  Building,
  Building2,
  Landmark,
  CreditCard,
  Shield,
  Car,
  Gift,
  Receipt,
  Users,
  HandCoins,
  FolderOpen,
} from 'lucide-react';
import type { IconName } from '../constants/documents';

const iconComponents = {
  Users,
  FileCheck,
  Building,
  Building2,
  Landmark,
  FileText,
  CreditCard,
  Shield,
  Car,
  Gift,
  Receipt,
  HandCoins,
  FolderOpen,
} as const;

/**
 * アイコン名からReactコンポーネントを取得
 */
export function getIcon(iconName: IconName, className = 'w-5 h-5') {
  const IconComponent = iconComponents[iconName];
  return <IconComponent className={className} />;
}
