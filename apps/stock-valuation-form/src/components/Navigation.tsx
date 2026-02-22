import { TABS } from '@/data/constants';
import type { TableId } from '@/types/form';

interface NavigationProps {
  activeTab: TableId;
  onTabChange: (tab: TableId) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="no-print flex flex-wrap gap-1 mb-4">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-3 py-1.5 text-xs border rounded transition-colors ${
            activeTab === tab.id
              ? 'bg-gray-800 text-white border-gray-800'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
          }`}
        >
          <span className="font-bold">{tab.label}</span>
          <span className="ml-1 text-[10px] opacity-70">{tab.subtitle}</span>
        </button>
      ))}
    </nav>
  );
}
