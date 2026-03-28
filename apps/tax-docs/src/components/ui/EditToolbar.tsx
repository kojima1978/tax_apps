import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Printer,
  FileSpreadsheet,
  ChevronsUpDown,
  ChevronsDownUp,
  RotateCcw,
  Download,
  Upload,
  ExternalLink,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Menu,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EXTERNAL_LINKS, TAX_TYPE_LABELS, type TaxType } from '@/constants';
import { formatReiwaYear, getDefaultYear } from '@/utils/helpers';

const CURRENT_YEAR = getDefaultYear();
const YEAR_OPTIONS: number[] = [];
for (let y = CURRENT_YEAR + 2; y >= CURRENT_YEAR - 4; y--) YEAR_OPTIONS.push(y);

// ─── 型定義 ───

type ToolbarAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  onFileSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  colorClass?: string;
};

type ExternalLinkItem = { key: 'ntaCheckSheet' | 'etaxDocuments'; shortLabel: string };

const EXTERNAL_LINK_ITEMS: ExternalLinkItem[] = [
  { key: 'ntaCheckSheet', shortLabel: 'チェックシート' },
  { key: 'etaxDocuments', shortLabel: 'e-Tax添付書類' },
];

// ─── Props ───

type EditToolbarProps = {
  taxType: TaxType;
  onTaxTypeChange: (type: TaxType) => void;
  year: number;
  onYearChange: (year: number) => void;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  staffName: string;
  onStaffNameChange: (name: string) => void;
  staffPhone: string;
  onStaffPhoneChange: (phone: string) => void;
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
  isDark: boolean;
  toggleDark: () => void;
  isExporting: boolean;
};

// ─── コンポーネント ───

export const EditToolbar = ({
  taxType,
  onTaxTypeChange,
  year,
  onYearChange,
  customerName,
  onCustomerNameChange,
  staffName,
  onStaffNameChange,
  staffPhone,
  onStaffPhoneChange,
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
  isDark,
  toggleDark,
  isExporting,
}: EditToolbarProps) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const ACTIONS: ToolbarAction[] = useMemo(() => [
    { id: 'print', label: '印刷', icon: Printer, onClick: onPrint, colorClass: 'bg-slate-700 text-white hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500' },
    { id: 'excel', label: 'Excel', icon: FileSpreadsheet, onClick: isExporting ? undefined : onExcelExport, colorClass: isExporting ? 'bg-emerald-400 cursor-not-allowed opacity-50 text-white' : 'bg-[#217346] text-white hover:bg-[#1e6b41]' },
    { id: 'json-export', label: 'ファイルに保存', icon: Download, onClick: onJsonExport, colorClass: 'bg-amber-600 text-white hover:bg-amber-700' },
    { id: 'json-import', label: 'ファイルを読込', icon: Upload, onFileSelect, colorClass: 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600' },
    { id: 'reset', label: 'リセット', icon: RotateCcw, onClick: onShowResetDialog, colorClass: 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600' },
  ], [onPrint, onExcelExport, onJsonExport, onFileSelect, onShowResetDialog, isExporting]);

  const inputClass = 'px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500';

  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 py-2.5">
        {/* 1行目: タイトル + 入力欄 */}
        <div className="flex items-end gap-3 flex-wrap">
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 pb-0.5 whitespace-nowrap">必要書類リスト</h1>
          <select
            value={taxType}
            onChange={(e) => onTaxTypeChange(e.target.value as TaxType)}
            className={`${inputClass} font-bold cursor-pointer`}
            aria-label="申告種別"
          >
            {(Object.entries(TAX_TYPE_LABELS) as [TaxType, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className={`${inputClass} font-bold cursor-pointer`}
            aria-label="対象年度"
          >
            {YEAR_OPTIONS.map(y => (
              <option key={y} value={y}>{formatReiwaYear(y)}分</option>
            ))}
          </select>
          <input
            type="text"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            placeholder="お客様名"
            className={`flex-1 min-w-[80px] ${inputClass}`}
            aria-label="お客様名"
          />
          <input
            type="text"
            value={staffName}
            onChange={(e) => onStaffNameChange(e.target.value)}
            placeholder="担当者"
            className={`flex-1 min-w-[80px] ${inputClass}`}
            aria-label="担当者"
          />
          <input
            type="text"
            value={staffPhone}
            onChange={(e) => onStaffPhoneChange(e.target.value)}
            placeholder="連絡先"
            className={`flex-1 min-w-[80px] ${inputClass}`}
            aria-label="連絡先"
          />
        </div>

        {/* 2行目: アクション */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* 展開/折畳 */}
            <div className="flex border border-slate-300 dark:border-slate-600 rounded overflow-hidden">
              <button onClick={() => onExpandAll(true)} className="px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center" title="すべて展開" aria-label="すべて展開">
                <ChevronsUpDown className="w-3 h-3 mr-0.5" />展開
              </button>
              <div className="w-px bg-slate-300 dark:bg-slate-600" />
              <button onClick={() => onExpandAll(false)} className="px-2 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center" title="すべて折りたたみ" aria-label="すべて折りたたみ">
                <ChevronsDownUp className="w-3 h-3 mr-0.5" />折畳
              </button>
            </div>

            {/* 印刷レイアウト */}
            <div className="hidden sm:flex border border-slate-300 dark:border-slate-600 rounded overflow-hidden">
              <button
                onClick={togglePrintColumn}
                className={`px-2.5 py-1 text-xs font-medium ${isTwoColumnPrint ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                aria-label={isTwoColumnPrint ? '1列レイアウトに切り替え' : '2列レイアウトに切り替え'}
              >
                {isTwoColumnPrint ? '2列' : '1列'}
              </button>
              <div className="w-px bg-slate-300 dark:bg-slate-600" />
              <button
                onClick={toggleHideSubmitted}
                className={`px-2.5 py-1 text-xs font-medium flex items-center ${hideSubmittedInPrint ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                aria-label={hideSubmittedInPrint ? '取消線も含めて印刷' : '未提出のみ印刷'}
              >
                {hideSubmittedInPrint ? <EyeOff className="w-3 h-3 mr-0.5" /> : <Eye className="w-3 h-3 mr-0.5" />}
                {hideSubmittedInPrint ? '未提出のみ' : '全書類'}
              </button>
            </div>

            {/* ダークモード */}
            <button
              onClick={toggleDark}
              className="p-1.5 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

          </div>

          {/* PC: アクションボタン群 */}
          <div className="hidden lg:flex gap-1.5">
            {/* 外部リンク */}
            {EXTERNAL_LINK_ITEMS.map(({ key, shortLabel }) => (
              <a
                key={key}
                href={EXTERNAL_LINKS[key].url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-2.5 py-1 text-xs rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600"
                title={EXTERNAL_LINKS[key].label}
              >
                <ExternalLink className="w-3 h-3 mr-1" />{shortLabel}
              </a>
            ))}
            {ACTIONS.map((action) => {
              if (action.onFileSelect) {
                return (
                  <label key={action.id} className={`flex items-center px-2.5 py-1 text-xs rounded cursor-pointer ${action.colorClass}`} aria-label={action.label}>
                    <action.icon className="w-3 h-3 mr-1" />{action.label}
                    <input type="file" accept=".json" onChange={action.onFileSelect} className="hidden" />
                  </label>
                );
              }
              return (
                <button key={action.id} onClick={action.onClick} className={`flex items-center px-2.5 py-1 text-xs rounded ${action.colorClass}`} aria-label={action.label}>
                  <action.icon className="w-3 h-3 mr-1" />{action.label}
                </button>
              );
            })}
          </div>

          {/* モバイル: ハンバーガーメニュー */}
          <div className="relative lg:hidden" ref={menuRef}>
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              aria-label="メニューを開く"
              aria-expanded={showMobileMenu}
            >
              <Menu className="w-5 h-5" />
            </button>

            {showMobileMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-fade-in">
                {/* 印刷設定（モバイル） */}
                <button onClick={() => { togglePrintColumn(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                  {isTwoColumnPrint ? '1列レイアウト' : '2列レイアウト'}
                </button>
                <button onClick={() => { toggleHideSubmitted(); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                  {hideSubmittedInPrint ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {hideSubmittedInPrint ? '全書類を印刷' : '未提出のみ印刷'}
                </button>
                <hr className="my-1 border-slate-200 dark:border-slate-700" />
                {ACTIONS.map((action) => {
                  if (action.onFileSelect) {
                    return (
                      <label key={action.id} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                        <action.icon className="w-4 h-4" />{action.label}
                        <input type="file" accept=".json" onChange={(e) => { action.onFileSelect!(e); setShowMobileMenu(false); }} className="hidden" />
                      </label>
                    );
                  }
                  return (
                    <button key={action.id} onClick={() => { action.onClick?.(); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                      <action.icon className="w-4 h-4" />{action.label}
                    </button>
                  );
                })}
                <hr className="my-1 border-slate-200 dark:border-slate-700" />
                {EXTERNAL_LINK_ITEMS.map(({ key, shortLabel }) => (
                  <a key={key} href={EXTERNAL_LINKS[key].url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                    <ExternalLink className="w-4 h-4" />{shortLabel}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
