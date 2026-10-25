import { Fragment, useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Printer,
  FileSpreadsheet,
  ChevronsUpDown,
  ChevronsDownUp,
  RotateCcw,
  Download,
  Upload,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Menu,
  Home,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Settings,
  Stamp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DOC_LIST_TYPE_LABELS, type DocListType } from '@/constants';
import type { CompanyInfo } from '@/shared/staff-directory/company';
import { CompanyField } from './CompanyField';

// ─── 型定義 ───

type ToolbarAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  onFileSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  colorClass?: string;
  /** 区切り線で分けるまとまり（印刷／ファイル／リセット） */
  group: 'print' | 'file' | 'reset';
};

// 色を付けるのは印刷だけ。ほかは枠線のボタンにそろえて、強い色が並ばないようにする
const OUTLINE_BUTTON_CLASS = 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600';

const LINK_EMERALD_CLASS = 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50';

/** ほかの画面への入口（見出し行の右側）。委任状は種別の選択肢にせずここに置く */
const NAV_LINKS: { to: string; label: string; icon: LucideIcon; colorClass: string }[] = [
  { to: '/resources', label: '参考資料', icon: FileText, colorClass: LINK_EMERALD_CLASS },
  { to: '/power-of-attorney', label: '委任状', icon: Stamp, colorClass: LINK_EMERALD_CLASS },
  { to: '/masters', label: 'マスタ管理', icon: Settings, colorClass: 'text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/70 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700' },
];

// ─── Props ───

type EditToolbarProps = {
  docListType: DocListType;
  onDocListTypeChange: (type: DocListType) => void;
  targetYear: number;
  onTargetYearChange: (year: number) => void;
  clientName: string;
  onClientNameChange: (name: string) => void;
  deceasedName: string;
  onDeceasedNameChange: (name: string) => void;
  personInCharge: string;
  onPersonInChargeChange: (name: string) => void;
  personInChargeContact: string;
  onPersonInChargeContactChange: (contact: string) => void;
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
  trashCount: number;
  onOpenTrash: () => void;
  onCompanySwitched: (company: CompanyInfo) => void;
};

// ─── コンポーネント ───

export const EditToolbar = ({
  docListType,
  onDocListTypeChange,
  targetYear,
  onTargetYearChange,
  clientName,
  onClientNameChange,
  deceasedName,
  onDeceasedNameChange,
  personInCharge,
  onPersonInChargeChange,
  personInChargeContact,
  onPersonInChargeContactChange,
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
  trashCount,
  onOpenTrash,
  onCompanySwitched,
}: EditToolbarProps) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  // 案件情報4欄はモバイルのみ折りたたむ（md以上は常時表示）
  const [showCaseInfo, setShowCaseInfo] = useState(false);
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
    { id: 'print', label: '印刷', icon: Printer, onClick: onPrint, group: 'print', colorClass: 'bg-slate-700 text-white hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500' },
    { id: 'excel', label: 'Excel', icon: FileSpreadsheet, onClick: isExporting ? undefined : onExcelExport, group: 'file', colorClass: isExporting ? `${OUTLINE_BUTTON_CLASS} cursor-not-allowed opacity-50` : OUTLINE_BUTTON_CLASS },
    { id: 'json-export', label: 'ファイルに保存', icon: Download, onClick: onJsonExport, group: 'file', colorClass: OUTLINE_BUTTON_CLASS },
    { id: 'json-import', label: 'ファイルを読込', icon: Upload, onFileSelect, group: 'file', colorClass: OUTLINE_BUTTON_CLASS },
    { id: 'reset', label: 'リセット', icon: RotateCcw, onClick: onShowResetDialog, group: 'reset', colorClass: OUTLINE_BUTTON_CLASS },
  ], [onPrint, onExcelExport, onJsonExport, onFileSelect, onShowResetDialog, isExporting]);

  // モバイルでは44x44pxのタップ領域を確保し、PCでは既存の密度を維持する
  const touchTargetClass = 'min-w-11 min-h-11 justify-center sm:min-w-6 sm:min-h-6';

  const inputClass = 'px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500';

  // 案件情報の入力欄（可視ラベル付き）。md以上は中身に合った固定幅にする
  // （残りの幅を埋めさせると、名前の欄が400px を超えて間延びしていた）
  const CASE_FIELDS = useMemo(() => [
    { id: 'client-name', label: '依頼者名', value: clientName, onChange: onClientNameChange, widthClass: 'md:w-40 xl:w-44' },
    { id: 'deceased-name', label: '被相続人名', value: deceasedName, onChange: onDeceasedNameChange, widthClass: 'md:w-40 xl:w-44' },
    { id: 'person-in-charge', label: '担当者', value: personInCharge, onChange: onPersonInChargeChange, widthClass: 'md:w-32 xl:w-36' },
    { id: 'person-in-charge-contact', label: '連絡先', value: personInChargeContact, onChange: onPersonInChargeContactChange, widthClass: 'md:w-48 xl:w-56' },
  ], [clientName, onClientNameChange, deceasedName, onDeceasedNameChange, personInCharge, onPersonInChargeChange, personInChargeContact, onPersonInChargeContactChange]);

  const filledCaseFieldCount = CASE_FIELDS.filter((f) => f.value.trim() !== '').length;

  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 py-2.5">
        {/* 1行目: どのリストを見ているか（種別・会社）＋ ほかの画面への入口 */}
        <div className="flex items-center gap-x-2 gap-y-1 md:gap-3 flex-wrap">
          <a href="/" className="flex items-center justify-center gap-1 min-h-6 min-w-6 text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors" title="ポータルに戻る">
            <Home className="h-5 w-5" />
            <span className="hidden xl:inline text-sm font-medium">ポータル</span>
          </a>
          {/* 装飾用の区切り — 読み上げ対象から除外 */}
          <span className="hidden xl:inline text-slate-300 dark:text-slate-600" aria-hidden="true">|</span>
          <h1 className="sr-only xl:not-sr-only text-lg font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">必要書類リスト</h1>
          <select
            value={docListType}
            onChange={(e) => onDocListTypeChange(e.target.value as DocListType)}
            className={`${inputClass} font-bold cursor-pointer max-w-[132px] truncate md:max-w-none`}
            aria-label="書類リスト種別"
          >
            {(Object.entries(DOC_LIST_TYPE_LABELS) as [DocListType, string][]).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {docListType === 'income-tax' && (
            <label className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              対象年度
              <select
                value={targetYear}
                onChange={(event) => onTargetYearChange(Number(event.target.value))}
                className={`${inputClass} cursor-pointer font-bold`}
                aria-label="対象年度"
              >
                {Array.from({ length: 7 }, (_, index) => new Date().getFullYear() + 1 - index).map((year) => (
                  <option key={year} value={year}>{year}年</option>
                ))}
              </select>
            </label>
          )}
          <CompanyField onSwitched={onCompanySwitched} />
          {/* ほかの画面への入口は右へ寄せて1つにまとめる */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap md:ml-auto">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs sm:text-sm font-medium border rounded transition-colors whitespace-nowrap ${link.colorClass}`}
              >
                <link.icon className="w-3.5 h-3.5" aria-hidden="true" />
                {link.label}
              </Link>
            ))}
            {/* ダークモード（書類の操作ではないので見出し行に置く） */}
            <button
              onClick={toggleDark}
              className={`p-1.5 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center ${touchTargetClass}`}
              aria-label={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
              title={isDark ? 'ライトモード' : 'ダークモード'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 2行目: 案件情報（モバイルは折りたたみ） */}
        <div className="mt-2">
          <button
            onClick={() => setShowCaseInfo((prev) => !prev)}
            className="md:hidden flex items-center gap-1 px-2.5 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            aria-expanded={showCaseInfo}
            aria-controls="case-info-fields"
          >
            <ClipboardList className="w-3.5 h-3.5" aria-hidden="true" />
            案件情報
            {filledCaseFieldCount > 0 && (
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{filledCaseFieldCount}</span>
            )}
            {showCaseInfo
              ? <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
              : <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            }
          </button>

          <div
            id="case-info-fields"
            className={`${showCaseInfo ? 'grid' : 'hidden'} grid-cols-2 gap-x-3 gap-y-2 mt-2 md:mt-0 md:flex md:flex-wrap md:items-center md:gap-x-4 xl:gap-x-5 md:gap-y-2`}
          >
            {CASE_FIELDS.map((field) => (
              // md以上はラベルを欄の左に置き、幅が足りなければ欄ごと次の行へ折り返す
              <div key={field.id} className="flex flex-col gap-0.5 min-w-0 md:flex-row md:items-center md:gap-1.5">
                <label
                  htmlFor={`case-${field.id}`}
                  className="text-xs font-medium text-slate-500 dark:text-slate-400 md:whitespace-nowrap"
                >
                  {field.label}
                </label>
                <input
                  id={`case-${field.id}`}
                  type="text"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  className={`w-full min-w-0 ${field.widthClass} ${inputClass}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* 3行目: 左はリストの操作、右は出力（印刷の設定は印刷ボタンの隣） */}
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/70 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* 展開/折畳 */}
            <div className="flex border border-slate-300 dark:border-slate-600 rounded overflow-hidden">
              <button onClick={() => onExpandAll(true)} className="px-3 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center min-h-11 sm:min-h-0 sm:px-2" title="すべて展開" aria-label="すべて展開">
                <ChevronsUpDown className="w-3 h-3 mr-0.5" />展開
              </button>
              <div className="w-px bg-slate-300 dark:bg-slate-600" />
              <button onClick={() => onExpandAll(false)} className="px-3 py-1 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center min-h-11 sm:min-h-0 sm:px-2" title="すべて折りたたみ" aria-label="すべて折りたたみ">
                <ChevronsDownUp className="w-3 h-3 mr-0.5" />折畳
              </button>
            </div>

            {/* ゴミ箱 */}
            <button
              onClick={onOpenTrash}
              className={`p-1.5 rounded text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center ${touchTargetClass}`}
              aria-label={`ゴミ箱（削除した書類・カテゴリ ${trashCount}件）`}
              title="ゴミ箱"
            >
              {/* バッジはアイコン基準に配置（タップ領域拡大時も離れないように） */}
              <span className="relative flex items-center">
                <Trash2 className="w-3.5 h-3.5" />
                {trashCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center text-[10px] font-bold leading-none text-white bg-red-600 rounded-full">
                    {trashCount > 99 ? '99+' : trashCount}
                  </span>
                )}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {/* 印刷の設定 */}
            <div className="hidden sm:flex border border-slate-300 dark:border-slate-600 rounded overflow-hidden" role="group" aria-label="印刷の設定">
              <button
                onClick={togglePrintColumn}
                className={`px-2.5 py-1 text-xs font-medium ${isTwoColumnPrint ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                aria-label={isTwoColumnPrint ? '1列レイアウトに切り替え' : '2列レイアウトに切り替え'}
                title="印刷のレイアウト"
              >
                {isTwoColumnPrint ? '2列' : '1列'}
              </button>
              <div className="w-px bg-slate-300 dark:bg-slate-600" />
              <button
                onClick={toggleHideSubmitted}
                className={`px-2.5 py-1 text-xs font-medium flex items-center ${hideSubmittedInPrint ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                aria-label={hideSubmittedInPrint ? '取消線も含めて印刷' : '未提出のみ印刷'}
                title="印刷に載せる書類"
              >
                {hideSubmittedInPrint ? <EyeOff className="w-3 h-3 mr-0.5" /> : <Eye className="w-3 h-3 mr-0.5" />}
                {hideSubmittedInPrint ? '未提出のみ' : '全書類'}
              </button>
            </div>

            {/* PC: アクションボタン群（まとまりの変わり目に区切り線） */}
            <div className="hidden lg:flex items-center gap-1.5">
              {ACTIONS.map((action, index) => {
                const separator = index > 0 && ACTIONS[index - 1].group !== action.group
                  ? <span className="w-px h-5 mx-1 bg-slate-300 dark:bg-slate-600" aria-hidden="true" />
                  : null;
                if (action.onFileSelect) {
                  return (
                    <Fragment key={action.id}>
                      {separator}
                      <label className={`flex items-center px-2.5 py-1 text-xs rounded cursor-pointer ${action.colorClass}`}>
                        <action.icon className="w-3 h-3 mr-1" />{action.label}
                        {/* sr-only（hiddenではない）でキーボードから到達可能にする */}
                        <input type="file" accept=".json" onChange={action.onFileSelect} className="sr-only" />
                      </label>
                    </Fragment>
                  );
                }
                return (
                  <Fragment key={action.id}>
                    {separator}
                    <button onClick={action.onClick} className={`flex items-center px-2.5 py-1 text-xs rounded ${action.colorClass}`} aria-label={action.label}>
                      <action.icon className="w-3 h-3 mr-1" />{action.label}
                    </button>
                  </Fragment>
                );
              })}
            </div>

            {/* モバイル: ハンバーガーメニュー */}
            <div className="relative lg:hidden" ref={menuRef}>
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className={`p-1.5 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center ${touchTargetClass}`}
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
                  {ACTIONS.map((action, index) => {
                    const separator = index > 0 && ACTIONS[index - 1].group !== action.group
                      ? <hr className="my-1 border-slate-200 dark:border-slate-700" />
                      : null;
                    if (action.onFileSelect) {
                      return (
                        <Fragment key={action.id}>
                          {separator}
                          <label className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                            <action.icon className="w-4 h-4" />{action.label}
                            <input type="file" accept=".json" onChange={(e) => { action.onFileSelect!(e); setShowMobileMenu(false); }} className="sr-only" />
                          </label>
                        </Fragment>
                      );
                    }
                    return (
                      <Fragment key={action.id}>
                        {separator}
                        <button onClick={() => { action.onClick?.(); setShowMobileMenu(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                          <action.icon className="w-4 h-4" />{action.label}
                        </button>
                      </Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
