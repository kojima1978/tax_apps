import { useEffect, useRef, useState } from 'react';
import { NAV_TABS, SUMMARY_TAB_ID } from '@/data/constants';
import type { TableId } from '@/types/form';

/** 開閉はこの端末だけの好みなので localStorage に置く（相続税の申告書と同じ作法） */
const SIDEBAR_KEY = 'stock-valuation-form:sidebar';

function initialOpen() {
  try {
    return localStorage.getItem(SIDEBAR_KEY) !== 'closed';
  } catch {
    return true;
  }
}

interface NavigationProps {
  /** 表示中の表（サマリーを開いている間は SUMMARY_TAB_ID） */
  activeId: string;
  onSelect: (id: string) => void;
  /** 入力値のある表か（印刷ダイアログと同じ判定） */
  hasData: (tab: TableId) => boolean;
  /** 第2表の判定で記載対象になる表か */
  isJudgmentTarget: (tab: TableId) => boolean;
}

export function Navigation({ activeId, onSelect, hasData, isJudgmentTarget }: NavigationProps) {
  const [open, setOpen] = useState(initialOpen);
  const activeRef = useRef<HTMLButtonElement>(null);
  const activeIndex = NAV_TABS.findIndex((tab) => tab.id === activeId);
  const currentTab = NAV_TABS[activeIndex] ?? NAV_TABS[0];
  const hasPrevious = activeIndex > 0;
  const hasNext = activeIndex >= 0 && activeIndex < NAV_TABS.length - 1;

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, open ? 'open' : 'closed');
    } catch {
      // プライベートウィンドウなどでは覚えないだけ
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeId, open]);

  const move = (offset: number) => {
    const nextTab = NAV_TABS[activeIndex + offset];
    if (nextTab) onSelect(nextTab.id);
  };

  // 様式ではないサマリーには入力済み・記載対象の印を付けない
  const stateOf = (tab: typeof NAV_TABS[number]) => {
    if (!tab.form) return { entered: false, target: false, state: '' };
    const entered = hasData(tab.id as TableId);
    const target = isJudgmentTarget(tab.id as TableId);
    return {
      entered,
      target,
      // 状態は色だけに頼らない（文字＋aria-labelでも伝える）
      state: [target ? '記載対象' : null, entered ? '入力済み' : '未入力'].filter(Boolean).join('・'),
    };
  };

  return (
    <aside className={`no-print app-sidebar${open ? '' : ' app-sidebar--closed'}`}>
      <div className="app-sidebar__head">
        <span className="app-sidebar__title">
          <strong>表を選択</strong>
          <small>第２表の判定で記載対象になる表に印が付きます</small>
        </span>
        <button
          type="button"
          className="app-sidebar__toggle"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-label={open ? '表の一覧を閉じる' : '表の一覧を開く'}
          title={open ? '表の一覧を閉じる' : '表の一覧を開く'}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d={open ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
          </svg>
        </button>
      </div>

      <div className="app-sidebar__content" hidden={!open}>
        <div className="table-nav-controls">
          <button type="button" className="table-nav-button" onClick={() => move(-1)} disabled={!hasPrevious}>
            ← 前へ
          </button>
          <button type="button" className="table-nav-button" onClick={() => move(1)} disabled={!hasNext}>
            次へ →
          </button>
        </div>

        {/* 開いている表は一覧で強調しているので画面には出さない（読み上げ用にだけ残す） */}
        <span className="table-current-label" aria-live="polite">
          {currentTab?.label} {currentTab?.subtitle}
        </span>

        <nav aria-label="表の選択">
          <ul className="form-list">
            {NAV_TABS.map((tab) => {
              const isActive = activeId === tab.id;
              const { entered, target, state } = stateOf(tab);
              const describe = state ? `${tab.label} ${tab.subtitle}（${state}）` : `${tab.label} ${tab.subtitle}`;
              return (
                <li
                  key={tab.id}
                  className={`form-item${isActive ? ' form-item--active' : ''}${tab.id === SUMMARY_TAB_ID ? ' form-item--summary' : ''}`}
                >
                  <button
                    type="button"
                    ref={isActive ? activeRef : undefined}
                    className="form-item__btn"
                    onClick={() => onSelect(tab.id)}
                    aria-current={isActive ? 'true' : undefined}
                    aria-label={describe}
                    title={state ? `${tab.label} ${tab.subtitle}／${state}` : describe}
                  >
                    <span className="form-item__line">
                      <span className="form-item__label">{tab.label}</span>
                      {target && <span className="form-status form-status--target" aria-hidden="true">記載対象</span>}
                      {entered && <span className="form-status form-status--entered" aria-hidden="true">入力済み</span>}
                    </span>
                    {/*
                      副題（「株主判定・会社規模」など）は縦一覧なら2行目に置ける。
                      横タブだった頃は幅が足りず title と aria-label にだけ入れていた。
                    */}
                    <small>{tab.subtitle}</small>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
