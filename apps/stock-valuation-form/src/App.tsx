import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Navigation } from '@/components/Navigation';
import { MIRRORED_FIELDS, useFormData } from '@/hooks/useFormData';
import { PrintRenderContext } from '@/components/ui/GridForm';
// Keep Table1_1Overlay and public/forms/table1.png for PNG layout measurement.
import { Table1_1Grid as Table1_1 } from '@/components/tables/Table1_1Grid';
import { Table1_2 } from '@/components/tables/table1-2';
import { Table2, printTablesForJudgment } from '@/components/tables/table2';
import { Table3 } from '@/components/tables/table3';
import { Table4_1, Table4_2 } from '@/components/tables/table4';
import { Table5 } from '@/components/tables/table5';
import { Table6 } from '@/components/tables/table6';
import { Table7_1, Table7_2, Table7_3 } from '@/components/tables/table7';
import { IndustryAdminPage } from '@/features/industryAdmin/IndustryAdminPage';
import type { TableId, TableProps } from '@/types/form';
import { TABS } from '@/data/constants';
import { PrerequisitesChip, PrerequisitesDialog } from '@/components/PrerequisitesDialog';
import { ClientSummaryPage } from '@/components/ClientSummaryPage';
import { RequiredFieldNavigator } from '@/components/RequiredFieldNavigator';
import { ConsistencyChecker } from '@/components/ConsistencyChecker';
import { ShortcutHelp } from '@/components/ShortcutHelp';
import { focusAndFlash } from '@/lib/focusField';

// 業種目データ管理は帳票と同居させない別画面。ハッシュで切り替える。
const ADMIN_HASH = '#industry-data';

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

// 「?」のような文字キーのショートカットは、入力中の文字を奪わないよう入力欄の外でだけ効かせる
const isTypingTarget = (target: EventTarget | null) => (
  target instanceof HTMLElement
  && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
);

export default function App() {
  const [activeTab, setActiveTab] = useState<TableId>('table1_1');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [printTarget, setPrintTarget] = useState<PrintTarget | null>(null);
  const { formData, savedAt, getField, updateField, resetAll, exportJson, importJson, rolloverToNextYear } = useFormData();
  const importRef = useRef<HTMLInputElement>(null);
  const printRequestedRef = useRef(false);
  const printAll = printTarget === 'all';
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [prereqOpen, setPrereqOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(() => window.location.hash === ADMIN_HASH);
  const [printSelection, setPrintSelection] = useState<Record<TableId, boolean>>(
    () => Object.fromEntries(TABS.map((t) => [t.id, true])) as Record<TableId, boolean>,
  );
  // お客様サマリーは様式ではないので、全表印刷では既定で外し、選びたいときだけ足す
  const [printSummary, setPrintSummary] = useState(false);
  // 自動転記欄から入力元へ飛ぶ前にいた場所（「戻る」用）
  const [jumpOrigin, setJumpOrigin] = useState<{ tab: TableId; fieldName: string | null } | null>(null);

  // 表に（UI状態 _* と他表からの転記先を除く）入力値があるか。第4表の1／2は共通バケット table4 を参照する
  const hasData = useCallback(
    (tab: TableId) => {
      const bucket = DATA_BUCKET[tab] ?? tab;
      const mirrored = MIRRORED_FIELDS[bucket];
      return Object.entries(formData[bucket]).some(
        ([k, v]) => !k.startsWith('_') && !mirrored?.has(k) && String(v).trim() !== '',
      );
    },
    [formData],
  );
  // 第2表の判定で記載対象になる表（タブのバッジと印刷ダイアログの初期選択で共用）
  const judgment = useMemo(() => printTablesForJudgment(getField), [getField]);
  const judgmentTargets = useMemo(() => new Set<TableId>(judgment.tables), [judgment]);
  const isJudgmentTarget = useCallback((tab: TableId) => judgmentTargets.has(tab), [judgmentTargets]);

  const setAllSelection = (fn: (tab: TableId) => boolean, summary: boolean) => {
    setPrintSelection(Object.fromEntries(TABS.map((t) => [t.id, fn(t.id)])) as Record<TableId, boolean>);
    setPrintSummary(summary);
  };

  // 表へ移動し、指定の欄（name属性）をフォーカス＋一瞬ハイライトする
  const goToField = useCallback((tab: TableId, fieldName: string | null) => {
    setSummaryOpen(false);
    setActiveTab(tab);
    if (!fieldName) return;
    // 表の描画後に探す。requestAnimationFrame は非表示タブで止まるので setTimeout を使う
    window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[name="${fieldName}"]`);
      if (el) focusAndFlash(el);
    }, 0);
  }, []);

  // 表を切り替える（タブ列とキーボードショートカットで共用）。切り替えたら移動履歴は捨てる
  const goToTab = useCallback((tab: TableId) => {
    setSummaryOpen(false);
    setJumpOrigin(null);
    setActiveTab(tab);
  }, []);

  // 自動転記欄クリック時に入力元の表へ移動する。戻れるように移動元を覚えておく
  const handleJump = useCallback((target: { tab: TableId; field: string }) => {
    const active = document.activeElement;
    setJumpOrigin({
      tab: activeTab,
      fieldName: active instanceof HTMLElement ? active.getAttribute('name') : null,
    });
    goToField(target.tab, `${DATA_BUCKET[target.tab] ?? target.tab}.${target.field}`);
  }, [activeTab, goToField]);

  // 移動元へ戻る（戻ったら履歴は消す。1段だけで足りる想定）
  const handleJumpBack = useCallback(() => {
    setJumpOrigin((origin) => {
      if (origin) goToField(origin.tab, origin.fieldName);
      return null;
    });
  }, [goToField]);

  const tableProps: TableProps = { getField, updateField, onTabChange: setActiveTab, onJump: handleJump };
  const ActiveTable = TABLE_COMPONENTS[activeTab];

  useEffect(() => {
    const syncAdmin = () => setAdminOpen(window.location.hash === ADMIN_HASH);
    window.addEventListener('hashchange', syncAdmin);
    return () => window.removeEventListener('hashchange', syncAdmin);
  }, []);

  const finishPrint = useCallback(() => {
    printRequestedRef.current = false;
    setPrintTarget(null);
  }, []);

  const requestPrint = useCallback((target: PrintTarget) => {
    if (printRequestedRef.current) return;
    printRequestedRef.current = true;
    setPrintTarget(target);
  }, []);

  // 全表印刷：選択ダイアログを開く（第2表の判定結果に応じた記載対象の表を初期チェック）
  const openPrintDialog = useCallback(() => {
    setAllSelection((tab) => judgmentTargets.has(tab), false);
    setPrintDialogOpen(true);
  }, [judgmentTargets]);
  const confirmPrintSelected = useCallback(() => {
    if (!TABS.some((t) => printSelection[t.id]) && !printSummary) return;
    setPrintDialogOpen(false);
    requestPrint('all');
  }, [printSelection, printSummary, requestPrint]);

  // 画面操作のショートカット。様式そのものには触れないので印刷結果は変わらない
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 日本語入力の変換中は横取りしない（変換の確定・候補選択を奪ってしまうため）
    if (event.isComposing) return;
    // ダイアログを開いている間と印刷準備中は、背後の表が勝手に動かないよう止める
    if (printDialogOpen || prereqOpen || printTarget !== null) return;

    const ctrl = event.ctrlKey || event.metaKey;
    if (ctrl && event.key === 's') {
      event.preventDefault();
      exportJson();
      return;
    }
    // 印刷はブラウザ既定に任せず必ずアプリの印刷経路へ流す。
    // 既定のままだと入力欄や転記マーク（✎）が出たまま刷られ、様式の見た目が変わってしまう
    if (ctrl && event.key === 'p') {
      event.preventDefault();
      requestPrint('current');
      return;
    }
    if (ctrl && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      const next = TABS[TABS.findIndex((t) => t.id === activeTab) + (event.key === 'ArrowLeft' ? -1 : 1)];
      if (!next) return;
      event.preventDefault();  // 入力欄の中では単語単位の移動が既定なので打ち消す
      goToTab(next.id);
      return;
    }
    // 「?」は入力できる文字なので、入力欄の外で押されたときだけ一覧の開閉に使う
    if (event.key === '?' && !ctrl && !isTypingTarget(event.target)) {
      event.preventDefault();
      setShortcutsOpen((open) => !open);
    }
  }, [activeTab, exportJson, goToTab, prereqOpen, printDialogOpen, printTarget, requestPrint]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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

  // 帳票の入力状態は残したまま画面だけ差し替える（フックはすべて上で呼び終えている）。
  if (adminOpen) {
    return <IndustryAdminPage onClose={() => { window.location.hash = ''; }} />;
  }

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
        <div className="app-header-right">
          <PrerequisitesChip getField={getField} onClick={() => setPrereqOpen(true)} />
          <span className="app-autosave" aria-live="polite">
            {savedAt
              ? `自動保存済み ${savedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
              : '入力するとこの端末に自動保存されます'}
          </span>
          <button
            type="button"
            className={`app-tool-btn app-summary-button${summaryOpen ? ' is-active' : ''}`}
            onClick={() => setSummaryOpen((open) => !open)}
          >
            {summaryOpen ? '帳票入力へ戻る' : 'お客様サマリー'}
          </button>
          <button
            type="button"
            className="app-tool-btn"
            onClick={() => { window.location.hash = ADMIN_HASH; }}
            title="類似業種比準価額に使う業種目マスタ・業種目別株価等を登録・訂正します"
          >
            業種目データ管理
          </button>
          <button
            type="button"
            className="app-tool-btn"
            onClick={() => setShortcutsOpen(true)}
            title="キーボードショートカットの一覧を表示します（? キー）"
          >
            ショートカット
          </button>
        </div>
      </header>

      <div className="no-print mobile-hint">
        横スクロールまたはピンチで拡大縮小できます。
      </div>

      <div className="no-print app-topbar">
        {summaryOpen ? (
          <div className="summary-topbar-title">
            <span>REPORT</span>
            <strong>お客様向け株式評価サマリー</strong>
            <small>入力済みデータから現状と打ち手を自動整理</small>
          </div>
        ) : (
          <Navigation
            activeTab={activeTab}
            onTabChange={goToTab}
            hasData={hasData}
            isJudgmentTarget={isJudgmentTarget}
          />
        )}

        <div className="app-toolbar" aria-label="帳票操作">
          {([
            { label: '保存 (JSON)', onClick: exportJson, title: 'Ctrl+S' },
            { label: '読込 (JSON)', onClick: () => importRef.current?.click() },
            { label: '翌年度更新', onClick: rolloverToNextYear, title: '直前期の数値を直前々期へ順送りして翌事業年度の評価に移行します（実行前に自動バックアップ）' },
            { label: '全表印刷', onClick: openPrintDialog },
            { label: '現在の表を印刷', onClick: () => requestPrint('current'), title: 'Ctrl+P' },
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
          {!summaryOpen && jumpOrigin && (
            <button
              type="button"
              className="app-tool-btn app-tool-btn-back"
              onClick={handleJumpBack}
              title="自動転記欄から入力元へ移動する前の位置に戻ります"
            >
              ◂ {TABS.find((t) => t.id === jumpOrigin.tab)?.label ?? '前の表'}へ戻る
            </button>
          )}
          {!summaryOpen && <RequiredFieldNavigator watch={`${activeTab}:${printTarget ?? ''}:${JSON.stringify(formData)}`} />}
          {!summaryOpen && <ConsistencyChecker getField={getField} onJump={(tab, field) => handleJump({ tab, field })} />}
          <input id="app-import-json" name="app.importJson" ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        </div>
      </div>


      <div className="app-shell">
        <main className="app-main">
          {summaryOpen && !printAll ? (
            <ClientSummaryPage
              getField={getField}
              updateField={updateField}
              onBack={() => setSummaryOpen(false)}
              onPrint={() => requestPrint('current')}
            />
          ) : printAll ? (
            <>
            {printSummary && (
              <ClientSummaryPage
                getField={getField}
                updateField={updateField}
                onBack={() => setSummaryOpen(false)}
                onPrint={() => requestPrint('current')}
              />
            )}
            {TABS.filter((tab) => printSelection[tab.id]).map((tab) => {
              const TableComp = TABLE_COMPONENTS[tab.id];
              // 第5表・第1表の1は続紙対応で自前に複数ページ（.gov-page）を描画するため外側で包まない
              return SELF_PAGING.has(tab.id) ? (
                <TableComp key={tab.id} {...tableProps} />
              ) : (
                <div key={tab.id} className="gov-page gov-page--exact">
                  <TableComp {...tableProps} />
                </div>
              );
            })}
            </>
          ) : SELF_PAGING.has(activeTab) ? (
            <ActiveTable {...tableProps} />
          ) : (
            <div className="gov-page gov-page--exact">
              <ActiveTable {...tableProps} />
            </div>
          )}
        </main>
      </div>

      {prereqOpen && (
        <PrerequisitesDialog getField={getField} updateField={updateField} onClose={() => setPrereqOpen(false)} />
      )}

      {shortcutsOpen && <ShortcutHelp onClose={() => setShortcutsOpen(false)} />}

      {printDialogOpen && (() => {
        const judgmentSet = judgmentTargets;
        return (
        <div className="no-print" onClick={() => setPrintDialogOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 8, padding: 20, minWidth: 340, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>印刷する表を選択</h2>
            <p style={{ fontSize: 12, color: '#666', margin: '0 0 12px' }}>第2表の判定結果に応じた記載対象の表を初期選択しています。チェックの追加・解除で自由に変更できます。</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => setAllSelection(() => true, true)} className="app-tool-btn">全選択</button>
              <button type="button" onClick={() => setAllSelection(() => false, false)} className="app-tool-btn">全解除</button>
              <button type="button" onClick={() => setAllSelection((tab) => hasData(tab), TABS.some((t) => hasData(t.id)))} className="app-tool-btn">入力済みのみ</button>
              <button type="button" onClick={() => setAllSelection((tab) => judgmentSet.has(tab), false)} className="app-tool-btn" title="第2表の判定結果に応じて記載対象となる表だけを選択します">第2表の判定で選択</button>
            </div>
            <p style={{ fontSize: 12, color: '#444', margin: '0 0 10px' }}>第2表の判定結果：<strong>{judgment.name}</strong></p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '3px 4px', marginBottom: 4, borderBottom: '1px solid #eee', cursor: 'pointer' }}>
                <input type="checkbox" checked={printSummary} onChange={(e) => setPrintSummary(e.target.checked)} />
                <span style={{ fontWeight: 600 }}>お客様サマリー</span>
                <span style={{ color: '#888', fontSize: 11 }}>入力済みデータから現状と打ち手を自動整理</span>
                <span style={{ marginLeft: 'auto', color: '#888', fontSize: 11 }}>様式ではありません</span>
              </label>
              {TABS.map((tab) => (
                <label key={tab.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '3px 4px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!printSelection[tab.id]} onChange={(e) => setPrintSelection((p) => ({ ...p, [tab.id]: e.target.checked }))} />
                  <span style={{ fontWeight: 600 }}>{tab.label}</span>
                  <span style={{ color: '#888', fontSize: 11 }}>{tab.subtitle}</span>
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    {judgmentSet.has(tab.id) && <span style={{ color: '#2563eb', fontSize: 11 }}>判定対象</span>}
                    {!hasData(tab.id) && <span style={{ color: '#bbb', fontSize: 11 }}>未入力</span>}
                  </span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button type="button" onClick={() => setPrintDialogOpen(false)} className="app-tool-btn">キャンセル</button>
              <button type="button" onClick={confirmPrintSelected} disabled={!TABS.some((t) => printSelection[t.id]) && !printSummary} className="app-tool-btn" style={{ fontWeight: 700 }}>印刷</button>
            </div>
          </div>
        </div>
        );
      })()}

      {printTarget !== null && (
        <div className="no-print" style={{ position: 'fixed', inset: 0, zIndex: 2500, background: 'rgba(255,255,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ background: '#333', color: '#fff', padding: '10px 22px', borderRadius: 8, fontSize: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>印刷準備中…</div>
        </div>
      )}
    </div>
    </PrintRenderContext.Provider>
  );
}
