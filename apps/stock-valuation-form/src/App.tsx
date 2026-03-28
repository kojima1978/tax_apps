import { useState, useEffect, useRef, useCallback } from 'react';
import { Navigation } from '@/components/Navigation';
import { useFormData } from '@/hooks/useFormData';
import { Table1_1 } from '@/components/tables/Table1_1';
import { Table1_2 } from '@/components/tables/Table1_2';
import { Table2 } from '@/components/tables/Table2';
import { Table3 } from '@/components/tables/Table3';
import { Table4 } from '@/components/tables/Table4';
import { Table5 } from '@/components/tables/Table5';
import { Table6 } from '@/components/tables/Table6';
import { Table7 } from '@/components/tables/Table7';
import { Table8 } from '@/components/tables/Table8';
import type { TableId, TableProps } from '@/types/form';
import { TABS } from '@/data/constants';

const TABLE_COMPONENTS: Record<TableId, React.ComponentType<TableProps>> = {
  table1_1: Table1_1,
  table1_2: Table1_2,
  table2: Table2,
  table3: Table3,
  table4: Table4,
  table5: Table5,
  table6: Table6,
  table7: Table7,
  table8: Table8,
};

/* SVG Icons (inline to avoid external dependency) */
const MenuIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<TableId>('table1_1');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [printAll, setPrintAll] = useState(false);
  const { getField, updateField, resetAll, exportJson, importJson } = useFormData();
  const importRef = useRef<HTMLInputElement>(null);

  const tableProps: TableProps = { getField, updateField, onTabChange: setActiveTab };

  const ActiveTable = TABLE_COMPONENTS[activeTab];

  /* Ctrl+S → JSON export */
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      exportJson();
    }
  }, [exportJson]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  /* Print all: render all tables, trigger print, then restore */
  const handlePrintAll = () => {
    setPrintAll(true);
    requestAnimationFrame(() => {
      window.print();
      setPrintAll(false);
    });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importJson(file);
    e.target.value = '';
  };

  return (
    <div className="app-root" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
      {/* ヘッダー */}
      <header className="no-print" style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: '1px solid #e2e8f0', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', height: 40, display: 'flex', alignItems: 'center', padding: '0 12px' }}>
        <a
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500, color: '#94a3b8', textDecoration: 'none', padding: '4px 8px', borderRadius: 6, transition: 'color 0.2s' }}
          title="ポータルに戻る"
          onMouseEnter={e => (e.currentTarget.style.color = '#059669')}
          onMouseLeave={e => (e.currentTarget.style.color = '#94a3b8')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
            <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
          ポータル
        </a>
      </header>

      {/* モバイルヒント */}
      <div className="no-print mobile-hint">
        横スクロールまたはピンチで拡大縮小できます
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 40px)', background: '#e5e5e5' }}>
        {/* 左サイドバー */}
        {sidebarOpen && (
          <aside className="no-print app-sidebar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#333', lineHeight: 1.3 }}>
                取引相場のない株式の<br />評価明細書
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="sidebar-close-btn"
                aria-label="サイドバーを閉じる"
              >
                <CloseIcon />
              </button>
            </div>
            <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

            {/* サイドバー下部: ツール */}
            <div style={{ marginTop: 'auto', padding: '6px 10px', borderTop: '1px solid #ddd', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button onClick={exportJson} className="sidebar-tool-btn" title="Ctrl+S">
                保存 (JSON)
              </button>
              <button onClick={() => importRef.current?.click()} className="sidebar-tool-btn">
                読込 (JSON)
              </button>
              <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
              <button onClick={handlePrintAll} className="sidebar-tool-btn">
                全表印刷
              </button>
              <button onClick={() => window.print()} className="sidebar-tool-btn">
                現在の表を印刷
              </button>
              <button onClick={resetAll} className="sidebar-tool-btn sidebar-tool-btn-danger">
                全データリセット
              </button>
            </div>
          </aside>
        )}

        {/* メインコンテンツ */}
        <main style={{ flex: 1, padding: 16, overflowX: 'auto' }}>
          {!sidebarOpen && (
            <button
              className="no-print menu-toggle-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="メニューを開く"
            >
              <MenuIcon />
              <span>メニュー</span>
            </button>
          )}

          {printAll ? (
            /* 全表印刷モード */
            TABS.map((tab) => {
              const TableComp = TABLE_COMPONENTS[tab.id];
              return (
                <div key={tab.id} className="gov-page">
                  <TableComp {...tableProps} />
                </div>
              );
            })
          ) : (
            <div className="gov-page">
              <ActiveTable {...tableProps} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
