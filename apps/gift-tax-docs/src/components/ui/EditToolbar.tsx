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
import { VerticalDivider } from './VerticalDivider';

// ─── ツールバーアクション定義 ───

type ToolbarAction =
  | { type: 'button'; id: string; label: string; pcLabel: string; icon: LucideIcon; color: string; onClick: () => void }
  | { type: 'file'; id: string; label: string; pcLabel: string; icon: LucideIcon; color: string; onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void }
  | { type: 'divider' };

type ExternalLinkItem = { key: 'ntaCheckSheet' | 'etaxDocuments'; shortLabel: string };

const EXTERNAL_LINK_ITEMS: ExternalLinkItem[] = [
  { key: 'ntaCheckSheet', shortLabel: 'シート' },
  { key: 'etaxDocuments', shortLabel: 'e-Tax' },
];

// ─── ツールバーボタン内部ヘルパー ───

type ToolbarButtonProps = {
  onClick?: () => void;
  className: string;
  title?: string;
  ariaLabel: string;
  icon: React.ReactNode;
  label?: string;
  asLabel?: boolean;
  children?: React.ReactNode;
};

const ToolbarButton = ({ onClick, className, title, ariaLabel, icon, label, asLabel, children }: ToolbarButtonProps) => {
  const baseClass = `flex items-center ${className}`;

  if (asLabel) {
    return (
      <label className={`${baseClass} cursor-pointer`} title={title} aria-label={ariaLabel}>
        {icon}
        {label}
        {children}
      </label>
    );
  }

  return (
    <button onClick={onClick} className={baseClass} title={title} aria-label={ariaLabel}>
      {icon}
      {label}
    </button>
  );
};

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

  const btnBase = 'px-3 py-2 text-sm rounded-lg transition-colors';
  const btnSlate = `${btnBase} bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200`;

  const TOOLBAR_ACTIONS: ToolbarAction[] = useMemo(() => [
    { type: 'button', id: 'expand', label: '全て展開', pcLabel: '展開', icon: ChevronsUpDown, color: 'slate', onClick: () => onExpandAll(true) },
    { type: 'button', id: 'collapse', label: '全て折りたたむ', pcLabel: '折畳', icon: ChevronUp, color: 'slate', onClick: () => onExpandAll(false) },
    { type: 'button', id: 'reset', label: 'リセット', pcLabel: 'リセット', icon: RotateCcw, color: 'amber', onClick: onShowResetDialog },
    { type: 'divider' },
    { type: 'button', id: 'json-export', label: 'JSON出力', pcLabel: '出力', icon: Download, color: 'violet', onClick: onJsonExport },
    { type: 'file', id: 'json-import', label: 'JSON取込', pcLabel: '取込', icon: Upload, color: 'violet', onFileSelect },
  ], [onExpandAll, onShowResetDialog, onJsonExport, onFileSelect]);

  const COLOR_CLASSES: Record<string, { pc: string; mobile: string }> = {
    slate: {
      pc: btnSlate,
      mobile: 'text-slate-600 dark:text-slate-300',
    },
    amber: {
      pc: `${btnBase} bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-800/50 text-amber-700 dark:text-amber-300`,
      mobile: 'text-amber-600 dark:text-amber-400',
    },
    violet: {
      pc: `${btnBase} bg-violet-100 dark:bg-violet-900/50 hover:bg-violet-200 dark:hover:bg-violet-800/50 text-violet-700 dark:text-violet-300`,
      mobile: 'text-violet-600 dark:text-violet-400',
    },
  };

  return (
    <div className="no-print bg-white/80 dark:bg-slate-800/90 backdrop-blur-md rounded-xl shadow-lg dark:shadow-slate-900/50 p-4 mb-6 sticky top-4 z-10 transition-colors border border-white/50 dark:border-slate-700/50" role="toolbar" aria-label="編集ツールバー">
      {/* 1行目: タイトル + メイン操作 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <a href="/" title="ポータルに戻る" aria-label="ポータルに戻る" className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex-shrink-0">
            <Home className="w-5 h-5" aria-hidden="true" />
          </a>
          <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-emerald-700 to-emerald-500 dark:from-emerald-400 dark:to-emerald-300 bg-clip-text text-transparent truncate">{giftData.title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* 検索トグル */}
          <button
            onClick={() => { setShowSearch(!showSearch); if (showSearch) onSearchChange(''); }}
            className={`p-2 rounded-lg transition-colors ${showSearch ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
            aria-label={showSearch ? '検索を閉じる' : '書類を検索'}
            title="検索"
          >
            {showSearch ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
          </button>

          {/* ダークモード */}
          <button
            onClick={toggleDark}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
            title={isDark ? 'ライトモード' : 'ダークモード'}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* PC: インラインボタン群 */}
          <div className="hidden lg:flex items-center gap-2">
            {TOOLBAR_ACTIONS.map((action, i) => {
              if (action.type === 'divider') return <VerticalDivider key={i} />;
              const Icon = action.icon;
              const colorClass = COLOR_CLASSES[action.color].pc;
              if (action.type === 'file') {
                return (
                  <ToolbarButton key={action.id} asLabel className={colorClass} title={action.label} ariaLabel={action.label} icon={<Icon className="w-4 h-4 mr-1" aria-hidden="true" />} label={action.pcLabel}>
                    <input type="file" accept=".json" onChange={action.onFileSelect} className="hidden" aria-label={action.label} />
                  </ToolbarButton>
                );
              }
              return (
                <ToolbarButton key={action.id} onClick={action.onClick} className={colorClass} title={action.label} ariaLabel={action.label} icon={<Icon className="w-4 h-4 mr-1" aria-hidden="true" />} label={action.pcLabel} />
              );
            })}
          </div>

          {/* モバイル: ハンバーガーメニュー */}
          <div className="relative lg:hidden" ref={menuRef}>
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="メニューを開く"
              aria-expanded={showMobileMenu}
            >
              <Menu className="w-5 h-5" />
            </button>

            {showMobileMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl dark:shadow-slate-900/80 border border-slate-200 dark:border-slate-700 py-2 z-50 animate-fade-in">
                {TOOLBAR_ACTIONS.map((action, i) => {
                  if (action.type === 'divider') return <hr key={i} className="my-1 border-slate-200 dark:border-slate-700" />;
                  const Icon = action.icon;
                  const colorClass = COLOR_CLASSES[action.color].mobile;
                  if (action.type === 'file') {
                    return (
                      <label key={action.id} className={`flex items-center gap-3 px-4 py-2.5 text-sm ${colorClass} hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer`}>
                        <Icon className="w-4 h-4" />
                        {action.label}
                        <input type="file" accept=".json" onChange={(e) => { action.onFileSelect(e); setShowMobileMenu(false); }} className="hidden" />
                      </label>
                    );
                  }
                  return (
                    <button key={action.id} onClick={() => { action.onClick(); setShowMobileMenu(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${colorClass} hover:bg-slate-50 dark:hover:bg-slate-700`}>
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
        <div className="mt-3 animate-fade-in">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="書類名で検索..."
              className="w-full pl-10 pr-10 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400"
              aria-label="書類名で検索"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                aria-label="検索をクリア"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2行目: 印刷設定 + 出力（外部リンクはPC表示のみ） */}
      <div className="flex flex-wrap items-center justify-end gap-2 mt-2">
        {/* 外部リンク（PCのみ） */}
        <div className="hidden lg:flex items-center gap-2">
          {EXTERNAL_LINK_ITEMS.map(({ key, shortLabel }) => (
            <a
              key={key}
              href={EXTERNAL_LINKS[key].url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center ${btnSlate}`}
              title={EXTERNAL_LINKS[key].label}
            >
              <ExternalLink className="w-4 h-4 mr-1" aria-hidden="true" />
              {shortLabel}
            </a>
          ))}
          <VerticalDivider />
        </div>

        <ToolbarButton
          onClick={toggleHideSubmitted}
          className={`${btnBase} font-medium ${
            hideSubmittedInPrint
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : btnSlate
          }`}
          title={hideSubmittedInPrint ? '取消線も含めて印刷' : '未提出のみ印刷'}
          ariaLabel={hideSubmittedInPrint ? '取消線も含めて印刷に切り替え' : '未提出のみ印刷に切り替え'}
          icon={hideSubmittedInPrint
            ? <EyeOff className="w-4 h-4 mr-1" aria-hidden="true" />
            : <Eye className="w-4 h-4 mr-1" aria-hidden="true" />
          }
          label={hideSubmittedInPrint ? '未提出のみ' : '取消線も印刷'}
        />
        <ToolbarButton
          onClick={togglePrintColumn}
          className={`${btnBase} font-medium ${
            isTwoColumnPrint
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : btnSlate
          }`}
          ariaLabel={isTwoColumnPrint ? '1列レイアウトに切り替え' : '2列レイアウトに切り替え'}
          icon={<Layout className="w-4 h-4 mr-1" aria-hidden="true" />}
          label={isTwoColumnPrint ? '2列' : '1列'}
        />
        <VerticalDivider />
        <ToolbarButton
          onClick={isExporting ? undefined : onExcelExport}
          className={`px-4 py-2 rounded-lg font-medium shadow-sm ${isExporting ? 'bg-blue-400 text-white cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white hover:shadow-md hover:shadow-blue-500/25'} transition-all`}
          ariaLabel="Excelファイルとして出力"
          icon={isExporting
            ? <span className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            : <FileSpreadsheet className="w-4 h-4 mr-2" aria-hidden="true" />
          }
          label="Excel"
        />
        <ToolbarButton
          onClick={onPrint}
          className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white rounded-lg font-medium shadow-sm hover:shadow-md hover:shadow-emerald-500/25 transition-all"
          ariaLabel="印刷またはPDF保存"
          icon={<Printer className="w-4 h-4 mr-2" aria-hidden="true" />}
          label="印刷"
        />
      </div>
    </div>
  );
};
