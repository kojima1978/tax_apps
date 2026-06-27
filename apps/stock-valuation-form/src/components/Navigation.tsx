import { useEffect, useRef } from 'react';
import { TABS } from '@/data/constants';
import type { TableId } from '@/types/form';

interface NavigationProps {
  activeTab: TableId;
  onTabChange: (tab: TableId) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const activeIndex = TABS.findIndex((tab) => tab.id === activeTab);
  const currentTab = TABS[activeIndex] ?? TABS[0];
  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex >= 0 && activeIndex < TABS.length - 1;

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activeTab]);

  const move = (offset: number) => {
    const nextTab = TABS[activeIndex + offset];
    if (nextTab) onTabChange(nextTab.id);
  };

  return (
    <nav className="table-nav" aria-label="表の選択">
      <div className="table-nav-controls">
        <label className="table-select-label" htmlFor="table-selector">
          表
        </label>
        <select
          id="table-selector"
          name="app.activeTable"
          className="table-select"
          value={activeTab}
          onChange={(event) => onTabChange(event.target.value as TableId)}
          aria-label="表示する表"
        >
          {TABS.map((tab) => (
            <option key={tab.id} value={tab.id}>
              {tab.label}　{tab.subtitle}
            </option>
          ))}
        </select>
        <button type="button" className="table-nav-button" onClick={() => move(-1)} disabled={!hasPrevious}>
          前へ
        </button>
        <button type="button" className="table-nav-button" onClick={() => move(1)} disabled={!hasNext}>
          次へ
        </button>
        <span className="table-current-label" aria-live="polite">
          {currentTab?.label} {currentTab?.subtitle}
        </span>
      </div>

      <div className="table-tab-list" role="tablist" aria-label="表一覧">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              ref={isActive ? activeRef : undefined}
              onClick={() => onTabChange(tab.id)}
              className={`table-tab-button${isActive ? ' table-tab-button-active' : ''}`}
              role="tab"
              aria-selected={isActive}
            >
              <span className="table-tab-label">{tab.label}</span>
              <span className="table-tab-subtitle">{tab.subtitle}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
