import { TABS } from '@/data/constants';
import type { TableId } from '@/types/form';

interface NavigationProps {
  activeTab: TableId;
  onTabChange: (tab: TableId) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  return (
    <nav className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 6,
              padding: '6px 10px',
              fontSize: 11,
              textAlign: 'left',
              border: 'none',
              borderRight: isActive ? '3px solid #1a1a1a' : '3px solid transparent',
              background: isActive ? '#f5f5f0' : 'transparent',
              fontWeight: isActive ? 700 : 400,
              color: isActive ? '#1a1a1a' : '#555',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#f0f0f0'; }}
            onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>{tab.label}</span>
            <span style={{ fontSize: 9, opacity: 0.6 }}>{tab.subtitle}</span>
          </button>
        );
      })}
    </nav>
  );
}
