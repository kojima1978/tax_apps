'use client';

import React from 'react';
import { ArrowLeft, Home, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';
import type { CaseSectionDef, CaseSectionKey } from '@/utils/caseSections';

interface CaseSidebarProps {
  sections: CaseSectionDef[];
  activeKey: CaseSectionKey;
  onSelect: (key: CaseSectionKey) => void;
  /** セクション名の右に出す件数バッジ(件数の概念がないセクションは省略) */
  counts?: Partial<Record<CaseSectionKey, number>>;
  collapsed: boolean;
  onToggleCollapse: () => void;
  customerName: string;
  onOpenCustomer: () => void;
  onBackToList: () => void;
}

const CaseSidebar: React.FC<CaseSidebarProps> = ({
  sections,
  activeKey,
  onSelect,
  counts,
  collapsed,
  onToggleCollapse,
  customerName,
  onOpenCustomer,
  onBackToList,
}) => (
  <aside className={`case-sidebar no-print ${collapsed ? 'collapsed' : ''}`}>
    <div className="case-sidebar-head">
      {!collapsed && <span className="case-sidebar-brand">保険証券分析</span>}
      <button
        type="button"
        className="case-sidebar-toggle"
        onClick={onToggleCollapse}
        title={collapsed ? 'サイドバーを開く' : 'サイドバーを畳む'}
        aria-label={collapsed ? 'サイドバーを開く' : 'サイドバーを畳む'}
      >
        {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
      </button>
    </div>

    <nav className="case-sidebar-nav" aria-label="表示セクション">
      {sections.map(section => {
        const Icon = section.icon;
        const count = counts?.[section.key];
        return (
          <button
            key={section.key}
            type="button"
            className={`case-nav-button ${section.key === activeKey ? 'active' : ''}`}
            onClick={() => onSelect(section.key)}
            title={collapsed ? section.label : section.description}
            aria-current={section.key === activeKey ? 'page' : undefined}
          >
            <Icon size={18} />
            {!collapsed && (
              <>
                <span className="case-nav-label">{section.label}</span>
                {count !== undefined && <span className="case-nav-count">{count}</span>}
              </>
            )}
          </button>
        );
      })}
    </nav>

    <div className="case-sidebar-foot">
      <button
        type="button"
        className="case-sidebar-link"
        onClick={onOpenCustomer}
        title="世帯・家族情報を編集"
      >
        <Settings size={16} />
        {!collapsed && <span>{customerName || 'お客様情報'}</span>}
      </button>
      <button type="button" className="case-sidebar-link" onClick={onBackToList} title="お客様一覧に戻る">
        <ArrowLeft size={16} />
        {!collapsed && <span>お客様一覧</span>}
      </button>
      {/* ゲートウェイのポータル(このアプリ外)へのリンクなので next/link は使えない */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="case-sidebar-link" title="ポータルに戻る">
        <Home size={16} />
        {!collapsed && <span>ポータル</span>}
      </a>
    </div>
  </aside>
);

export default CaseSidebar;
