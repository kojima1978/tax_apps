import { useState, useRef, useEffect } from 'react';
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
import { giftData, EXTERNAL_LINKS } from '@/constants';
import { VerticalDivider } from './VerticalDivider';

const EXTERNAL_LINK_ITEMS = [
  { key: 'ntaCheckSheet', shortLabel: 'シート' },
  { key: 'etaxDocuments', shortLabel: 'e-Tax' },
] as const;

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
  const baseClass = `flex items-center transition-colors ${className}`;

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
  checkedCount: number;
  totalCount: number;
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
  checkedCount,
  totalCount,
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

  const pct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  const btnBase = 'px-3 py-2 text-sm rounded-lg';
  const btnSlate = `${btnBase} bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200`;

  return (
    <div className="no-print bg-white dark:bg-slate-800 rounded-xl shadow-lg dark:shadow-slate-900/50 p-4 mb-6 sticky top-4 z-10 transition-colors" role="toolbar" aria-label="編集ツールバー">
      {/* 1行目: タイトル + メイン操作 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <a href="/" title="ポータルに戻る" aria-label="ポータルに戻る" className="text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex-shrink-0">
            <Home className="w-5 h-5" aria-hidden="true" />
          </a>
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 truncate">{giftData.title}</h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium tabular-nums" aria-live="polite">
              {checkedCount}/{totalCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">{pct}%</span>
          </div>
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
            <ToolbarButton onClick={() => onExpandAll(true)} className={btnSlate} title="全て展開" ariaLabel="全カテゴリを展開" icon={<ChevronsUpDown className="w-4 h-4 mr-1" aria-hidden="true" />} label="展開" />
            <ToolbarButton onClick={() => onExpandAll(false)} className={btnSlate} title="全て折りたたむ" ariaLabel="全カテゴリを折りたたむ" icon={<ChevronUp className="w-4 h-4 mr-1" aria-hidden="true" />} label="折畳" />
            <ToolbarButton onClick={onShowResetDialog} className={`${btnBase} bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-800/50 text-amber-700 dark:text-amber-300`} title="デフォルトに戻す" ariaLabel="編集内容をリセット" icon={<RotateCcw className="w-4 h-4 mr-1" aria-hidden="true" />} label="リセット" />
            <VerticalDivider />
            <ToolbarButton onClick={onJsonExport} className={`${btnBase} bg-violet-100 dark:bg-violet-900/50 hover:bg-violet-200 dark:hover:bg-violet-800/50 text-violet-700 dark:text-violet-300`} title="JSONで出力" ariaLabel="JSONファイルとして出力" icon={<Download className="w-4 h-4 mr-1" aria-hidden="true" />} label="出力" />
            <ToolbarButton asLabel className={`${btnBase} bg-violet-100 dark:bg-violet-900/50 hover:bg-violet-200 dark:hover:bg-violet-800/50 text-violet-700 dark:text-violet-300`} title="JSONを取り込み" ariaLabel="JSONファイルを選択" icon={<Upload className="w-4 h-4 mr-1" aria-hidden="true" />} label="取込">
              <input type="file" accept=".json" onChange={onFileSelect} className="hidden" aria-label="JSONファイルを選択" />
            </ToolbarButton>
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
                {[
                  { onClick: () => { onExpandAll(true); setShowMobileMenu(false); }, icon: <ChevronsUpDown className="w-4 h-4" />, label: '全て展開' },
                  { onClick: () => { onExpandAll(false); setShowMobileMenu(false); }, icon: <ChevronUp className="w-4 h-4" />, label: '全て折りたたむ' },
                  { onClick: () => { onShowResetDialog(); setShowMobileMenu(false); }, icon: <RotateCcw className="w-4 h-4" />, label: 'リセット', color: 'text-amber-600 dark:text-amber-400' },
                  'divider' as const,
                  { onClick: () => { onJsonExport(); setShowMobileMenu(false); }, icon: <Download className="w-4 h-4" />, label: 'JSON出力', color: 'text-violet-600 dark:text-violet-400' },
                  'divider' as const,
                  ...EXTERNAL_LINK_ITEMS.map(({ key, shortLabel }) => ({
                    href: EXTERNAL_LINKS[key].url,
                    icon: <ExternalLink className="w-4 h-4" />,
                    label: shortLabel,
                  })),
                ].map((item, i) => {
                  if (item === 'divider') return <hr key={i} className="my-1 border-slate-200 dark:border-slate-700" />;
                  if ('href' in item) {
                    return (
                      <a key={i} href={item.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                        {item.icon}
                        {item.label}
                      </a>
                    );
                  }
                  return (
                    <button key={i} onClick={item.onClick} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm ${item.color || 'text-slate-600 dark:text-slate-300'} hover:bg-slate-50 dark:hover:bg-slate-700`}>
                      {item.icon}
                      {item.label}
                    </button>
                  );
                })}
                {/* JSON取込（label付き） */}
                <label className="flex items-center gap-3 px-4 py-2.5 text-sm text-violet-600 dark:text-violet-400 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  JSON取込
                  <input type="file" accept=".json" onChange={(e) => { onFileSelect(e); setShowMobileMenu(false); }} className="hidden" />
                </label>
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
          className={`px-4 py-2 rounded-lg font-medium ${isExporting ? 'bg-blue-400 text-white cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          ariaLabel="Excelファイルとして出力"
          icon={isExporting
            ? <span className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
            : <FileSpreadsheet className="w-4 h-4 mr-2" aria-hidden="true" />
          }
          label="Excel"
        />
        <ToolbarButton
          onClick={onPrint}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
          ariaLabel="印刷またはPDF保存"
          icon={<Printer className="w-4 h-4 mr-2" aria-hidden="true" />}
          label="印刷"
        />
      </div>
    </div>
  );
};
