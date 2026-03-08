import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2.5 mb-4 pl-3 border-l-4 border-green-500">
    <Icon className="w-5 h-5 text-green-600" aria-hidden="true" />
    <h2 className="text-xl font-bold text-gray-800">{title}</h2>
  </div>
);
