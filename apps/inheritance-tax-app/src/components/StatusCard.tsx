import React from 'react';
import CheckCircle from 'lucide-react/icons/check-circle';
import AlertTriangle from 'lucide-react/icons/alert-triangle';
import XCircle from 'lucide-react/icons/x-circle';

type StatusCardVariant = 'success' | 'warning' | 'error';

const VARIANT_STYLES = {
  success: {
    container: 'bg-green-50 border-green-200',
    title: 'text-green-800',
    description: 'text-green-600',
    icon: CheckCircle,
    iconClass: 'text-green-500',
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200',
    title: 'text-yellow-800',
    description: 'text-yellow-600',
    icon: AlertTriangle,
    iconClass: 'text-yellow-500',
  },
  error: {
    container: 'bg-red-50 border-red-300',
    title: 'text-red-800',
    description: 'text-red-600',
    icon: XCircle,
    iconClass: 'text-red-500',
  },
} as const;

interface StatusCardProps {
  variant: StatusCardVariant;
  title: string;
  description?: string;
  compact?: boolean;
  className?: string;
}

export const StatusCard: React.FC<StatusCardProps> = ({
  variant,
  title,
  description,
  compact,
  className = '',
}) => {
  const styles = VARIANT_STYLES[variant];
  const Icon = styles.icon;
  return (
    <div className={`${styles.container} border-2 rounded-lg ${compact ? 'p-4' : 'p-8'} text-center ${className}`}>
      <div className={`flex items-center justify-center gap-2 ${description ? 'mb-2' : ''}`}>
        <Icon className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} ${styles.iconClass} flex-shrink-0`} />
        <p className={`${compact ? 'text-sm' : 'text-lg'} font-bold ${styles.title}`}>
          {title}
        </p>
      </div>
      {description && (
        <p className={`${compact ? 'text-xs' : 'text-sm'} ${styles.description}`}>
          {description}
        </p>
      )}
    </div>
  );
};
