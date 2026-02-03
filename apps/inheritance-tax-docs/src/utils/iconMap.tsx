import {
  FileText,
  FileCheck,
  Building,
  Home,
  Landmark,
  CreditCard,
  Shield,
  Car,
  Gift,
  Receipt,
  Users,
} from 'lucide-react';
import type { IconName } from '../constants/documents';

const iconComponents = {
  Users,
  FileCheck,
  Building,
  Home,
  Landmark,
  FileText,
  CreditCard,
  Shield,
  Car,
  Gift,
  Receipt,
} as const;

/**
 * アイコン名からReactコンポーネントを取得
 */
export function getIcon(iconName: IconName, className = 'w-5 h-5') {
  const IconComponent = iconComponents[iconName];
  return <IconComponent className={className} />;
}
