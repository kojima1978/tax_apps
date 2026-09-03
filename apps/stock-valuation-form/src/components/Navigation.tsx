import { useEffect, useRef } from 'react';
import { TABS } from '@/data/constants';
import type { TableId } from '@/types/form';

interface NavigationProps {
  activeTab: TableId;
  onTabChange: (tab: TableId) => void;
  /** 入力値のある表か（印刷ダイアログと同じ判定） */
  hasData: (tab: TableId) => boolean;
  /** 第2表の判定で記載対象になる表か */
  isJudgmentTarget: (tab: TableId) => boolean;
}

export function Navigation({ activeTab, onTabChange, hasData, isJudgmentTarget }: NavigationProps) {
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
        <button type="button" className="table-nav-button" onClick={() => move(-1)} disabled={!hasPrevious}>
          前へ
        </button>
        <button type="button" className="table-nav-button" onClick={() => move(1)} disabled={!hasNext}>
          次へ
        </button>
        {/* 表セレクトはタブ列が横スクロールになる狭い画面用（広い画面ではタブ列と重複するので隠す） */}
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
              {hasData(tab.id) ? '●' : '　'}{tab.label}　{tab.subtitle}{isJudgmentTarget(tab.id) ? '（記載対象）' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* 現在の表はタブ列で強調しているので画面には出さない（読み上げ用にだけ残す） */}
      <span className="table-current-label" aria-live="polite">
        {currentTab?.label} {currentTab?.subtitle}
      </span>

      <div className="table-tab-list" role="tablist" aria-label="表一覧">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const entered = hasData(tab.id);
          const target = isJudgmentTarget(tab.id);
          // 状態は色だけに頼らない（記号＋aria-labelでも伝える）
          const state = [target ? '記載対象' : null, entered ? '入力済み' : '未入力'].filter(Boolean).join('・');
          return (
            <button
              key={tab.id}
              type="button"
              ref={isActive ? activeRef : undefined}
              onClick={() => onTabChange(tab.id)}
              className={`table-tab-button${isActive ? ' table-tab-button-active' : ''}${target ? ' table-tab-button-target' : ''}`}
              role="tab"
              aria-selected={isActive}
              aria-label={`${tab.label} ${tab.subtitle}（${state}）`}
              title={`${tab.label} ${tab.subtitle}／${state}`}
            >
              <span className="table-tab-label-row">
                <span className="table-tab-label">{tab.label}</span>
                {target && <span className="table-tab-flag" aria-hidden="true">対象</span>}
                {entered && <span className="table-tab-dot" aria-hidden="true" />}
              </span>
              <span className="table-tab-subtitle">{tab.subtitle}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
