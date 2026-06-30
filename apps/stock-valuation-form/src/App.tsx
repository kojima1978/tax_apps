import { useState, useEffect, useRef, useCallback } from 'react';
import { Navigation } from '@/components/Navigation';
import { useFormData } from '@/hooks/useFormData';
import { PrintRenderContext } from '@/components/ui/GridForm';
// Keep Table1_1Overlay and public/forms/table1.png for PNG layout measurement.
import { Table1_1Grid as Table1_1 } from '@/components/tables/Table1_1Grid';
import { Table1_2 } from '@/components/tables/table1-2';
import { Table2 } from '@/components/tables/table2';
import { Table3 } from '@/components/tables/table3';
import { Table4 } from '@/components/tables/table4';
import { Table5 } from '@/components/tables/table5';
import { Table6 } from '@/components/tables/table6';
import { Table7 } from '@/components/tables/table7';
import { Table8 } from '@/components/tables/table8';
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

type PrintTarget = 'current' | 'all';
const PRINT_PREPARE_DELAY_MS = 80;

export default function App() {
  const [activeTab, setActiveTab] = useState<TableId>('table1_1');
  const [printTarget, setPrintTarget] = useState<PrintTarget | null>(null);
  const { getField, updateField, resetAll, exportJson, importJson } = useFormData();
  const importRef = useRef<HTMLInputElement>(null);
  const printRequestedRef = useRef(false);
  const printAll = printTarget === 'all';

  // 自動転記欄クリック時に入力元の表へ移動し、対象欄をフォーカス＋一瞬ハイライト
  const handleJump = useCallback((target: { tab: TableId; field: string }) => {
    setActiveTab(target.tab);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(`[name="${target.tab}.${target.field}"]`);
        if (!el) return;
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el.focus();
        const prevShadow = el.style.boxShadow;
        const prevBg = el.style.background;
        el.style.boxShadow = 'inset 0 0 0 2px #2563eb';
        el.style.background = '#dbeafe';
        setTimeout(() => {
          el.style.boxShadow = prevShadow;
          el.style.background = prevBg;
        }, 1500);
      });
    });
  }, []);

  const tableProps: TableProps = { getField, updateField, onTabChange: setActiveTab, onJump: handleJump };
  const ActiveTable = TABLE_COMPONENTS[activeTab];

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      exportJson();
    }
  }, [exportJson]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const finishPrint = useCallback(() => {
    printRequestedRef.current = false;
    setPrintTarget(null);
  }, []);

  const requestPrint = useCallback((target: PrintTarget) => {
    if (printRequestedRef.current) return;
    printRequestedRef.current = true;
    setPrintTarget(target);
  }, []);

  useEffect(() => {
    if (!printTarget) return;

    let cancelled = false;
    let fallbackTimer: number | undefined;

    const waitForNextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const waitForPrintReady = async () => {
      await waitForNextFrame();
      await waitForNextFrame();
      await document.fonts?.ready.catch(() => undefined);
      await new Promise<void>((resolve) => window.setTimeout(resolve, PRINT_PREPARE_DELAY_MS));

      if (cancelled) return;

      const onAfterPrint = () => {
        if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
        finishPrint();
      };

      window.addEventListener('afterprint', onAfterPrint, { once: true });
      window.print();
      fallbackTimer = window.setTimeout(finishPrint, 1000);
    };

    void waitForPrintReady();

    return () => {
      cancelled = true;
      if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
    };
  }, [finishPrint, printTarget]);

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) importJson(file);
    event.target.value = '';
  };

  return (
    <PrintRenderContext.Provider value={printTarget !== null}>
    <div className="app-root" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
      <header className="no-print app-header">
        <a href="/" className="app-home-link" title="ポータルに戻る">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
            <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
          ポータル
        </a>
        <div className="app-header-title">取引相場のない株式の評価明細書</div>
      </header>

      <div className="no-print mobile-hint">
        横スクロールまたはピンチで拡大縮小できます。
      </div>

      <div className="no-print app-topbar">
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="app-toolbar" aria-label="帳票操作">
          {([
            { label: '保存 (JSON)', onClick: exportJson, title: 'Ctrl+S' },
            { label: '読込 (JSON)', onClick: () => importRef.current?.click() },
            { label: '全表印刷', onClick: () => requestPrint('all') },
            { label: '現在の表を印刷', onClick: () => requestPrint('current') },
            { label: '全データリセット', onClick: resetAll, danger: true },
          ] as const).map((tool) => (
            <button
              key={tool.label}
              type="button"
              onClick={tool.onClick}
              className={`app-tool-btn${'danger' in tool && tool.danger ? ' app-tool-btn-danger' : ''}`}
              title={'title' in tool ? tool.title : undefined}
            >
              {tool.label}
            </button>
          ))}
          <input id="app-import-json" name="app.importJson" ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        </div>
      </div>

      <div className="app-shell">
        <main className="app-main">
          {printAll ? (
            TABS.map((tab) => {
              const TableComp = TABLE_COMPONENTS[tab.id];
              // 第5表は続紙対応で自前に複数ページ（.gov-page）を描画するため外側で包まない
              return tab.id === 'table5' ? (
                <TableComp key={tab.id} {...tableProps} />
              ) : (
                <div key={tab.id} className="gov-page">
                  <TableComp {...tableProps} />
                </div>
              );
            })
          ) : activeTab === 'table5' ? (
            <ActiveTable {...tableProps} />
          ) : (
            <div className="gov-page">
              <ActiveTable {...tableProps} />
            </div>
          )}
        </main>
      </div>
    </div>
    </PrintRenderContext.Provider>
  );
}
