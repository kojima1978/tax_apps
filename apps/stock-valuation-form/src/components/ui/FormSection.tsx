import type { ReactNode } from 'react';

interface FormSectionProps {
  children: ReactNode;
  className?: string;
}

export function FormSection({ children, className = '' }: FormSectionProps) {
  return <div className={`gov-section ${className}`}>{children}</div>;
}
