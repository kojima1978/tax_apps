import type { ReactNode } from 'react';

interface VerticalTextProps {
  children: ReactNode;
  className?: string;
}

export function VerticalText({ children, className = '' }: VerticalTextProps) {
  return (
    <div className={`gov-vertical flex items-center justify-center ${className}`}>
      {children}
    </div>
  );
}
