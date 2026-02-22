import React from 'react';

type StatusCardVariant = 'success' | 'warning' | 'error';

const VARIANT_STYLES = {
  success: {
    container: 'bg-green-50 border-green-200',
    title: 'text-green-800',
    description: 'text-green-600',
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200',
    title: 'text-yellow-800',
    description: 'text-yellow-600',
  },
  error: {
    container: 'bg-red-50 border-red-300',
    title: 'text-red-800',
    description: 'text-red-600',
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
  return (
    <div className={`${styles.container} border-2 rounded-lg ${compact ? 'p-4' : 'p-8'} text-center ${className}`}>
      <p className={`${compact ? 'text-sm' : 'text-lg'} font-bold ${styles.title}${description ? ' mb-2' : ''}`}>
        {title}
      </p>
      {description && (
        <p className={`${compact ? 'text-xs' : 'text-sm'} ${styles.description}`}>
          {description}
        </p>
      )}
    </div>
  );
};
