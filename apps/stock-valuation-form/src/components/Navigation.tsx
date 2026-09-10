import { useEffect, useRef } from 'react';
import { NAV_TABS, SUMMARY_TAB_ID } from '@/data/constants';
import type { TableId } from '@/types/form';

interface NavigationProps {
  /** 表示中のタブ（サマリーを開いている間はこのナビごと出さない） */
  activeId: string;
  onSelect: (id: string) => void;
  /** 入力値のある表か（印刷ダイアログと同じ判定） */
  hasData: (tab: TableId) => boolean;
  /** 第2表の判定で記載対象になる表か */
  isJudgmentTarget: (tab: TableId) => boolean;
}

export function Navigation({ activeId, onSelect, hasData, isJudgmentTarget }: NavigationProps) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const activeIndex = NAV_TABS.findIndex((tab) => tab.id === activeId);
  const currentTab = NAV_TABS[activeIndex] ?? NAV_TABS[0];
  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex >= 0 && activeIndex < NAV_TABS.length - 1;

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }, [activeId]);

  const move = (offset: number) => {
    const nextTab = NAV_TABS[activeIndex + offset];
    if (nextTab) onSelect(nextTab.id);
  };

  // 様式ではないサマリーには入力済み・記載対象の印を付けない
  const stateOf = (tab: typeof NAV_TABS[number]) => {
    if (!tab.form) return { entered: false, target: false, state: '様式ではありません' };
    const entered = hasData(tab.id as TableId);
    const target = isJudgmentTarget(tab.id as TableId);
    return {
      entered,
      target,
      // 状態は色だけに頼らない（記号＋aria-labelでも伝える）
      state: [target ? '記載対象' : null, entered ? '入力済み' : '未入力'].filter(Boolean).join('・'),
    };
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
          value={activeId}
          onChange={(event) => onSelect(event.target.value)}
          aria-label="表示する表"
        >
          {NAV_TABS.map((tab) => {
            const { entered, target } = stateOf(tab);
            return (
              <option key={tab.id} value={tab.id}>
                {entered ? '●' : '　'}{tab.label}　{tab.subtitle}{target ? '（記載対象）' : ''}
              </option>
            );
          })}
        </select>
      </div>

      {/* 現在の表はタブ列で強調しているので画面には出さない（読み上げ用にだけ残す） */}
      <span className="table-current-label" aria-live="polite">
        {currentTab?.label} {currentTab?.subtitle}
      </span>

      <div className="table-tab-list" role="tablist" aria-label="表一覧">
        {NAV_TABS.map((tab) => {
          const isActive = activeId === tab.id;
          const { entered, target, state } = stateOf(tab);
          return (
            <button
              key={tab.id}
              type="button"
              ref={isActive ? activeRef : undefined}
              onClick={() => onSelect(tab.id)}
              className={`table-tab-button${isActive ? ' table-tab-button-active' : ''}${target ? ' table-tab-button-target' : ''}${tab.id === SUMMARY_TAB_ID ? ' table-tab-button-summary' : ''}`}
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
