import { useState, useRef, useEffect, useMemo } from 'react';
import {
  ChevronUp,
  Printer,
  FileSpreadsheet,
  ChevronsUpDown,
  RotateCcw,
  Download,
  Upload,
  Home,
  ExternalLink,
  Layout,
  Eye,
  EyeOff,
  Search,
  X,
  Moon,
  Sun,
  Menu,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { giftData, EXTERNAL_LINKS } from '@/constants';

// ─── ツールバーアクション定義 ───

type ToolbarAction =
  | { type: 'button'; id: string; label: string; pcLabel: string; icon: LucideIcon; onClick: () => void }
  | { type: 'file'; id: string; label: string; pcLabel: string; icon: LucideIcon; onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void }
  | { type: 'divider' };

type ExternalLinkItem = { key: 'ntaCheckSheet' | 'etaxDocuments'; shortLabel: string };

const EXTERNAL_LINK_ITEMS: ExternalLinkItem[] = [
  { key: 'ntaCheckSheet', shortLabel: 'シート' },
  { key: 'etaxDocuments', shortLabel: 'e-Tax' },
];

const TOOLBAR_BTN = 'flex items-center px-4 py-2 rounded-lg text-white shadow font-bold text-sm';
const TOOLBAR_BTN_DEFAULT = `${TOOLBAR_BTN} bg-white/15 hover:bg-white/25 backdrop-blur-sm`;

// ─── ツールバー Props ───

type EditToolbarProps = {
  onExpandAll: (expand: boolean) => void;
  onShowResetDialog: () => void;
  onJsonExport: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPrint: () => void;
  onExcelExport: () => void;
  isTwoColumnPrint: boolean;
  togglePrintColumn: () => void;
  hideSubmittedInPrint: boolean;
  toggleHideSubmitted: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isDark: boolean;
  toggleDark: () => void;
  isExporting: boolean;
};

// ─── ツールバーコンポーネント ───

export const EditToolbar = ({
  onExpandAll,
  onShowResetDialog,
  onJsonExport,
  onFileSelect,
  onPrint,
  onExcelExport,
  isTwoColumnPrint,
  togglePrintColumn,
  hideSubmittedInPrint,
  toggleHideSubmitted,
  searchQuery,
  onSearchChange,
  isDark,
  toggleDark,
  isExporting,
}: EditToolbarProps) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus();
  }, [showSearch]);

  useEffect(() => {
    if (!showMobileMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMobileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMobileMenu]);

  const TOOLBAR_ACTIONS: ToolbarAction[] = useMemo(() => [
    { type: 'button', id: 'expand', label: '全て展開', pcLabel: '展開', icon: ChevronsUpDown, onClick: () => onExpandAll(true) },
    { type: 'button', id: 'collapse', label: '全て折りたたむ', pcLabel: '折畳', icon: ChevronUp, onClick: () => onExpandAll(false) },
    { type: 'button', id: 'reset', label: 'リセット', pcLabel: 'リセット', icon: RotateCcw, onClick: onShowResetDialog },
    { type: 'divider' },
    { type: 'button', id: 'json-export', label: 'JSON出力', pcLabel: '出力', icon: Download, onClick: onJsonExport },
    { type: 'file', id: 'json-import', label: 'JSON取込', pcLabel: '取込', icon: Upload, onFileSelect },
  ], [onExpandAll, onShowResetDialog, onJsonExport, onFileSelect]);

  return (
    <header className="header-gradient text-white no-print" role="toolbar" aria-label="編集ツールバー">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-3">
        {/* 1行目: タイトル + メイン操作 */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <a href="/" title="ポータルに戻る" aria-label="ポータルに戻る" className="opacity-70 hover:opacity-100 transition-opacity flex-shrink-0">
              <Home className="w-6 h-6" aria-hidden="true" />
            </a>
            <h1 className="text-2xl font-bold truncate">{giftData.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* 検索トグル */}
            <button
              onClick={() => { setShowSearch(!showSearch); if (showSearch) onSearchChange(''); }}
              className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-white/25' : 'opacity-70 hover:opacity-100 hover:bg-white/15'}`}
              aria-label={showSearch ? '検索を閉じる' : '書類を検索'}
              title="検索"
            >
              {showSearch ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
            </button>

            {/* ダークモード */}
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg opacity-70 hover:opacity-100 hover:bg-white/15 transition-colors"
              aria-label={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
              title={isDark ? 'ライトモード' : 'ダークモード'}
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* PC: インラインボタン群 */}
            <div className="hidden lg:flex items-center gap-2">
              {TOOLBAR_ACTIONS.map((action, i) => {
                if (action.type === 'divider') return <div key={i} className="w-px h-6 bg-white/30 mx-1" aria-hidden="true" />;
                const Icon = action.icon;
                if (action.type === 'file') {
                  return (
                    <label key={action.id} className={`${TOOLBAR_BTN_DEFAULT} cursor-pointer`} title={action.label} aria-label={action.label}>
                      <Icon className="w-4 h-4 mr-1" aria-hidden="true" />
                      {action.pcLabel}
                      <input type="file" accept=".json" onChange={action.onFileSelect} className="hidden" aria-label={action.label} />
                    </label>
                  );
                }
                return (
                  <button key={action.id} onClick={action.onClick} className={TOOLBAR_BTN_DEFAULT} title={action.label} aria-label={action.label}>
                    <Icon className="w-4 h-4 mr-1" aria-hidden="true" />
                    {action.pcLabel}
                  </button>
                );
              })}
            </div>

            {/* モバイル: ハンバーガーメニュー */}
            <div className="relative lg:hidden" ref={menuRef}>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 rounded-lg opacity-70 hover:opacity-100 hover:bg-white/15 transition-colors"
                aria-label="メニューを開く"
                aria-expanded={showMobileMenu}
              >
                <Menu className="w-5 h-5" />
              </button>

              {showMobileMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-fade-in">
                  {TOOLBAR_ACTIONS.map((action, i) => {
                    if (action.type === 'divider') return <hr key={i} className="my-1 border-slate-200 dark:border-slate-700" />;
                    const Icon = action.icon;
                    if (action.type === 'file') {
                      return (
                        <label key={action.id} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                          <Icon className="w-4 h-4" />
                          {action.label}
                          <input type="file" accept=".json" onChange={(e) => { action.onFileSelect(e); setShowMobileMenu(false); }} className="hidden" />
                        </label>
                      );
                    }
                    return (
                      <button key={action.id} onClick={() => { action.onClick(); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                        <Icon className="w-4 h-4" />
                        {action.label}
                      </button>
                    );
                  })}
                  <hr className="my-1 border-slate-200 dark:border-slate-700" />
                  {EXTERNAL_LINK_ITEMS.map(({ key, shortLabel }) => (
                    <a key={key} href={EXTERNAL_LINKS[key].url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                      <ExternalLink className="w-4 h-4" />
                      {shortLabel}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 検索バー */}
        {showSearch && (
          <div className="animate-fade-in">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-200" aria-hidden="true" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="書類名で検索..."
                className="w-full pl-10 pr-10 py-2 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 text-sm bg-white/15 text-white placeholder-emerald-200 backdrop-blur-sm"
                aria-label="書類名で検索"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-200 hover:text-white"
                  aria-label="検索をクリア"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 2行目: 印刷設定 + 出力 */}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {/* 外部リンク（PCのみ） */}
          <div className="hidden lg:flex items-center gap-2">
            {EXTERNAL_LINK_ITEMS.map(({ key, shortLabel }) => (
              <a
                key={key}
                href={EXTERNAL_LINKS[key].url}
                target="_blank"
                rel="noopener noreferrer"
                className={TOOLBAR_BTN_DEFAULT}
                title={EXTERNAL_LINKS[key].label}
              >
                <ExternalLink className="w-4 h-4 mr-1" aria-hidden="true" />
                {shortLabel}
              </a>
            ))}
            <div className="w-px h-6 bg-white/30 mx-1" aria-hidden="true" />
          </div>

          <button
            onClick={toggleHideSubmitted}
            className={`${TOOLBAR_BTN} ${
              hideSubmittedInPrint
                ? 'bg-amber-500/80 hover:bg-amber-500'
                : 'bg-white/15 hover:bg-white/25 backdrop-blur-sm'
            }`}
            title={hideSubmittedInPrint ? '取消線も含めて印刷' : '未提出のみ印刷'}
            aria-label={hideSubmittedInPrint ? '取消線も含めて印刷に切り替え' : '未提出のみ印刷に切り替え'}
          >
            {hideSubmittedInPrint
              ? <EyeOff className="w-4 h-4 mr-1" aria-hidden="true" />
              : <Eye className="w-4 h-4 mr-1" aria-hidden="true" />
            }
            {hideSubmittedInPrint ? '未提出のみ' : '取消線も印刷'}
          </button>
          <button
            onClick={togglePrintColumn}
            className={`${TOOLBAR_BTN} ${
              isTwoColumnPrint
                ? 'bg-indigo-500/80 hover:bg-indigo-500'
                : 'bg-white/15 hover:bg-white/25 backdrop-blur-sm'
            }`}
            aria-label={isTwoColumnPrint ? '1列レイアウトに切り替え' : '2列レイアウトに切り替え'}
          >
            <Layout className="w-4 h-4 mr-1" aria-hidden="true" />
            {isTwoColumnPrint ? '2列' : '1列'}
          </button>
          <div className="w-px h-6 bg-white/30 mx-1" aria-hidden="true" />
          <button
            onClick={isExporting ? undefined : onExcelExport}
            className={`${TOOLBAR_BTN} ${isExporting ? 'bg-emerald-400 cursor-not-allowed opacity-50' : 'bg-emerald-500/80 hover:bg-emerald-500'}`}
            aria-label="Excelファイルとして出力"
          >
            {isExporting
              ? <span className="w-4 h-4 mr-1 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
              : <FileSpreadsheet className="w-4 h-4 mr-1" aria-hidden="true" />
            }
            {isExporting ? '出力中...' : 'Excel'}
          </button>
          <button
            onClick={onPrint}
            className={TOOLBAR_BTN_DEFAULT}
            aria-label="印刷またはPDF保存"
          >
            <Printer className="w-4 h-4 mr-1" aria-hidden="true" />
            印刷
          </button>
        </div>
      </div>
    </header>
  );
};
