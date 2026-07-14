import { useState, useEffect, useRef, useCallback } from 'react';
import { Navigation } from '@/components/Navigation';
import { useFormData } from '@/hooks/useFormData';
import { PrintRenderContext } from '@/components/ui/GridForm';
// Keep Table1_1Overlay and public/forms/table1.png for PNG layout measurement.
import { Table1_1Grid as Table1_1 } from '@/components/tables/Table1_1Grid';
import { Table1_2 } from '@/components/tables/table1-2';
import { Table2 } from '@/components/tables/table2';
import { Table3 } from '@/components/tables/table3';
import { Table4_1, Table4_2 } from '@/components/tables/table4';
import { Table5 } from '@/components/tables/table5';
import { Table6 } from '@/components/tables/table6';
import { Table7_1, Table7_2, Table7_3 } from '@/components/tables/table7';
import type { TableId, TableProps } from '@/types/form';
import { TABS } from '@/data/constants';

const TABLE_COMPONENTS: Record<TableId, React.ComponentType<TableProps>> = {
  table1_1: Table1_1,
  table1_2: Table1_2,
  table2: Table2,
  table3: Table3,
  table4: Table4_2,   // 旧table4 IDのフォールバック（タブには出さない）
  table4_1: Table4_1,
  table4_2: Table4_2,
  table5: Table5,
  table6: Table6,
  table7: Table7_2,   // 旧table7 IDのフォールバック（タブには出さない）
  table7_1: Table7_1,
  table7_2: Table7_2,
  table7_3: Table7_3,
  table8: Table7_3,   // 旧table8 IDのフォールバック（第7表の3のデータバケット）
};

// 自前で複数ページ（.gov-page）を描画するタブ（外側で .gov-page ラップしない）
const SELF_PAGING = new Set<TableId>(['table5', 'table1_1']);

// 表示のみ分割し、データは共通バケットに保存する（第4表→table4、第7表の1/2→table7、第7表の3→table8）
const DATA_BUCKET: Partial<Record<TableId, TableId>> = {
  table4_1: 'table4', table4_2: 'table4',
  table7_1: 'table7', table7_2: 'table7', table7_3: 'table8',
};

type PrintTarget = 'current' | 'all';
const PRINT_PREPARE_DELAY_MS = 80;

export default function App() {
  const [activeTab, setActiveTab] = useState<TableId>('table1_1');
  const [printTarget, setPrintTarget] = useState<PrintTarget | null>(null);
  const { formData, getField, updateField, resetAll, exportJson, importJson } = useFormData();
  const importRef = useRef<HTMLInputElement>(null);
  const printRequestedRef = useRef(false);
  const printAll = printTarget === 'all';
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printSelection, setPrintSelection] = useState<Record<TableId, boolean>>(
    () => Object.fromEntries(TABS.map((t) => [t.id, true])) as Record<TableId, boolean>,
  );

  // 表に（UI状態 _* を除く）入力値があるか。第4表の1／2は共通バケット table4 を参照する
  const hasData = useCallback(
    (tab: TableId) => {
      const bucket = DATA_BUCKET[tab] ?? tab;
      return Object.entries(formData[bucket]).some(([k, v]) => !k.startsWith('_') && String(v).trim() !== '');
    },
    [formData],
  );
  const setAllSelection = (fn: (tab: TableId) => boolean) =>
    setPrintSelection(Object.fromEntries(TABS.map((t) => [t.id, fn(t.id)])) as Record<TableId, boolean>);

  // 自動転記欄クリック時に入力元の表へ移動し、対象欄をフォーカス＋一瞬ハイライト
  const handleJump = useCallback((target: { tab: TableId; field: string }) => {
    setActiveTab(target.tab);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const fieldTable = DATA_BUCKET[target.tab] ?? target.tab;
        const el = document.querySelector<HTMLElement>(`[name="${fieldTable}.${target.field}"]`);
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

  // 全表印刷：選択ダイアログを開く（入力済みの表を初期チェック＝空様式はスキップ）
  const openPrintDialog = useCallback(() => {
    setAllSelection((tab) => hasData(tab));
    setPrintDialogOpen(true);
  }, [hasData]);
  const confirmPrintSelected = useCallback(() => {
    if (!TABS.some((t) => printSelection[t.id])) return;
    setPrintDialogOpen(false);
    requestPrint('all');
  }, [printSelection, requestPrint]);

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
            { label: '全表印刷', onClick: openPrintDialog },
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
            TABS.filter((tab) => printSelection[tab.id]).map((tab) => {
              const TableComp = TABLE_COMPONENTS[tab.id];
              // 第5表・第1表の1は続紙対応で自前に複数ページ（.gov-page）を描画するため外側で包まない
              return SELF_PAGING.has(tab.id) ? (
                <TableComp key={tab.id} {...tableProps} />
              ) : (
                <div key={tab.id} className="gov-page">
                  <TableComp {...tableProps} />
                </div>
              );
            })
          ) : SELF_PAGING.has(activeTab) ? (
            <ActiveTable {...tableProps} />
          ) : (
            <div className="gov-page">
              <ActiveTable {...tableProps} />
            </div>
          )}
        </main>
      </div>

      {printDialogOpen && (
        <div className="no-print" onClick={() => setPrintDialogOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 8, padding: 20, minWidth: 340, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>印刷する表を選択</h2>
            <p style={{ fontSize: 12, color: '#666', margin: '0 0 12px' }}>入力のある表を初期選択しています（空の様式はチェックを外せばスキップ＝印刷が速くなります）。</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <button type="button" onClick={() => setAllSelection(() => true)} className="app-tool-btn">全選択</button>
              <button type="button" onClick={() => setAllSelection(() => false)} className="app-tool-btn">全解除</button>
              <button type="button" onClick={() => setAllSelection((tab) => hasData(tab))} className="app-tool-btn">入力済みのみ</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {TABS.map((tab) => (
                <label key={tab.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '3px 4px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!printSelection[tab.id]} onChange={(e) => setPrintSelection((p) => ({ ...p, [tab.id]: e.target.checked }))} />
                  <span style={{ fontWeight: 600 }}>{tab.label}</span>
                  <span style={{ color: '#888', fontSize: 11 }}>{tab.subtitle}</span>
                  {!hasData(tab.id) && <span style={{ color: '#bbb', fontSize: 11, marginLeft: 'auto' }}>未入力</span>}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={() => setPrintDialogOpen(false)} className="app-tool-btn">キャンセル</button>
              <button type="button" onClick={confirmPrintSelected} disabled={!TABS.some((t) => printSelection[t.id])} className="app-tool-btn" style={{ fontWeight: 700 }}>印刷</button>
            </div>
          </div>
        </div>
      )}

      {printTarget !== null && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, zIndex: 2500, background: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ background: '#333', color: '#fff', padding: '10px 22px', borderRadius: 8, fontSize: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>印刷準備中…</div>
        </div>
      )}
    </div>
    </PrintRenderContext.Provider>
  );
}
