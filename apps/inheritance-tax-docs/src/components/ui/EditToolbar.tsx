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
  Menu,
  Home,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Settings,
  Stamp,
  BookOpenCheck,
  CircleHelp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { DOC_LIST_TYPE_LABELS, usesDeceasedName, type DocListType } from '@/constants';
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

/** 補助画面はヘッダーに並べず、1つのメニューへまとめる */
const NAV_LINKS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/resources', label: '参考資料', icon: FileText },
  { to: '/power-of-attorney', label: '委任状', icon: Stamp },
  { to: '/masters', label: 'マスタ管理', icon: Settings },
  { to: '/help', label: '使い方', icon: CircleHelp },
];

// ─── 印刷対象の設定（2択の切り替え） ───

type PrintSetting = {
  id: string;
  label: string;
  options: { label: string; active: boolean }[];
  toggle: () => void;
};

const PrintSettingSegment = ({ setting, large = false }: { setting: PrintSetting; large?: boolean }) => (
  <div className="flex border border-slate-300 dark:border-slate-600 rounded overflow-hidden" role="group" aria-label={`印刷の${setting.label}`}>
    {setting.options.map((option, index) => (
      <Fragment key={option.label}>
        {index > 0 && <div className="w-px bg-slate-300 dark:bg-slate-600" aria-hidden="true" />}
        <button
          type="button"
          // 2択なので、押されていない方を押したときだけ切り替える
          onClick={() => { if (!option.active) setting.toggle(); }}
          className={`${large ? 'px-3 py-2 text-sm min-h-11' : 'px-2 xl:px-2.5 py-1 text-xs'} font-medium whitespace-nowrap transition-colors ${
            option.active
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
          aria-pressed={option.active}
        >
          {option.label}
        </button>
      </Fragment>
    ))}
  </div>
);

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
  onExpandAll: (expand: boolean) => void;
  onShowResetDialog: () => void;
  onJsonExport: () => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPrint: () => void;
  onOpenAcquisitionGuides?: () => void;
  onExcelExport: () => void;
  hideSubmittedInPrint: boolean;
  toggleHideSubmitted: () => void;
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
  onExpandAll,
  onShowResetDialog,
  onJsonExport,
  onFileSelect,
  onPrint,
  onOpenAcquisitionGuides,
  onExcelExport,
  hideSubmittedInPrint,
  toggleHideSubmitted,
  isExporting,
  trashCount,
  onOpenTrash,
  onCompanySwitched,
}: EditToolbarProps) => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNavMenu, setShowNavMenu] = useState(false);
  // 案件情報4欄は必要なときだけ開き、通常のヘッダーを2段に保つ
  const [showCaseInfo, setShowCaseInfo] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMobileMenu && !showNavMenu) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (showMobileMenu && menuRef.current && !menuRef.current.contains(target)) {
        setShowMobileMenu(false);
      }
      if (showNavMenu && navMenuRef.current && !navMenuRef.current.contains(target)) setShowNavMenu(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showMobileMenu, showNavMenu]);

  const ACTIONS: ToolbarAction[] = useMemo(() => [
    ...(onOpenAcquisitionGuides ? [{ id: 'acquisition-guides', label: '取得案内', icon: BookOpenCheck, onClick: onOpenAcquisitionGuides, group: 'print' as const, colorClass: 'bg-emerald-700 text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500' }] : []),
    { id: 'print', label: '印刷', icon: Printer, onClick: onPrint, group: 'print', colorClass: 'bg-slate-700 text-white hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500' },
    { id: 'excel', label: 'Excel', icon: FileSpreadsheet, onClick: isExporting ? undefined : onExcelExport, group: 'file', colorClass: isExporting ? `${OUTLINE_BUTTON_CLASS} cursor-not-allowed opacity-50` : OUTLINE_BUTTON_CLASS },
    { id: 'json-export', label: 'ファイルに保存', icon: Download, onClick: onJsonExport, group: 'file', colorClass: OUTLINE_BUTTON_CLASS },
    { id: 'json-import', label: 'ファイルを読込', icon: Upload, onFileSelect, group: 'file', colorClass: OUTLINE_BUTTON_CLASS },
    { id: 'reset', label: 'リセット', icon: RotateCcw, onClick: onShowResetDialog, group: 'reset', colorClass: OUTLINE_BUTTON_CLASS },
  ], [onOpenAcquisitionGuides, onPrint, onExcelExport, onJsonExport, onFileSelect, onShowResetDialog, isExporting]);

  const PRINT_SETTINGS: PrintSetting[] = useMemo(() => [
    { id: 'scope', label: '載せる書類', options: [{ label: '全書類', active: !hideSubmittedInPrint }, { label: '未提出のみ', active: hideSubmittedInPrint }], toggle: toggleHideSubmitted },
  ], [hideSubmittedInPrint, toggleHideSubmitted]);

  // モバイルでは44x44pxのタップ領域を確保し、PCでは既存の密度を維持する
  const touchTargetClass = 'min-w-11 min-h-11 justify-center sm:min-w-6 sm:min-h-6';

  const inputClass = 'px-2.5 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500';

  // 案件情報の入力欄（可視ラベル付き）。md以上は中身に合った固定幅にする
  // （残りの幅を埋めさせると、名前の欄が400px を超えて間延びしていた）
  const CASE_FIELDS = useMemo(() => [
    { id: 'client-name', label: '依頼者名', value: clientName, onChange: onClientNameChange, widthClass: 'md:w-40 xl:w-44' },
    ...(usesDeceasedName(docListType)
      ? [{ id: 'deceased-name', label: '被相続人名', value: deceasedName, onChange: onDeceasedNameChange, widthClass: 'md:w-40 xl:w-44' }]
      : []),
    { id: 'person-in-charge', label: '担当者', value: personInCharge, onChange: onPersonInChargeChange, widthClass: 'md:w-32 xl:w-36' },
  ], [docListType, clientName, onClientNameChange, deceasedName, onDeceasedNameChange, personInCharge, onPersonInChargeChange]);

  const filledCaseFieldCount = CASE_FIELDS.filter((f) => f.value.trim() !== '').length;

  return (
    <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 shadow-sm no-print">
      <div className="max-w-7xl mx-auto px-4 py-2.5">
        {/* 1行目: 今見ているリストだけを表示し、補助画面はメニューへまとめる */}
        <div className="flex items-center gap-x-2 gap-y-1 md:gap-3 flex-wrap">
          <a href="/" className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-emerald-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-emerald-400 sm:min-h-8 sm:min-w-8 lg:hidden" aria-label="ポータルに戻る" title="ポータルに戻る">
            <Home className="h-5 w-5" />
          </a>
          <h1 className="hidden whitespace-nowrap text-xs font-medium text-slate-600 dark:text-slate-300 lg:block">必要書類</h1>
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
          <button
            type="button"
            onClick={() => setShowCaseInfo((prev) => !prev)}
            className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 sm:min-h-8"
            aria-expanded={showCaseInfo}
            aria-controls="case-info-fields"
          >
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            案件情報
            {filledCaseFieldCount > 0 ? (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-100 px-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                {filledCaseFieldCount}
              </span>
            ) : null}
            {showCaseInfo
              ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
              : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            }
          </button>
          <div className="relative ml-auto lg:hidden" ref={navMenuRef}>
            <button
              type="button"
              onClick={() => setShowNavMenu((open) => !open)}
              className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700 sm:min-h-8 sm:min-w-8 sm:py-1"
              aria-label="画面メニューを開く"
              aria-expanded={showNavMenu}
              aria-haspopup="menu"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">メニュー</span>
            </button>
            {showNavMenu ? (
              <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                {NAV_LINKS.map((link) => (
                  <Link key={link.to} to={link.to} role="menuitem" onClick={() => setShowNavMenu(false)} className="flex min-h-11 items-center gap-3 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:text-slate-200 dark:hover:bg-slate-700">
                    <link.icon className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          <div className="ml-auto hidden items-center gap-2 lg:flex" aria-label="リスト操作">
            <div className="flex overflow-hidden rounded-lg border border-slate-300 dark:border-slate-600">
              <button onClick={() => onExpandAll(true)} className="flex min-h-9 cursor-pointer items-center px-2.5 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:text-slate-300 dark:hover:bg-slate-700" title="すべて展開" aria-label="すべて展開">
                <ChevronsUpDown className="mr-1 h-3.5 w-3.5" aria-hidden="true" />展開
              </button>
              <div className="w-px bg-slate-300 dark:bg-slate-600" aria-hidden="true" />
              <button onClick={() => onExpandAll(false)} className="flex min-h-9 cursor-pointer items-center px-2.5 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-500 dark:text-slate-300 dark:hover:bg-slate-700" title="すべて折りたたみ" aria-label="すべて折りたたみ">
                <ChevronsDownUp className="mr-1 h-3.5 w-3.5" aria-hidden="true" />折畳
              </button>
            </div>
            <button
              type="button"
              onClick={onOpenTrash}
              className="flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-400 dark:hover:bg-slate-700"
              aria-label={`ゴミ箱（削除した書類・カテゴリ ${trashCount}件）`}
              title="ゴミ箱"
            >
              <span className="relative flex items-center">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {trashCount > 0 ? (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                    {trashCount > 99 ? '99+' : trashCount}
                  </span>
                ) : null}
              </span>
            </button>
          </div>
        </div>

        {/* 案件情報は編集中だけ一時的に展開する。閉じている通常時はヘッダーが2段になる */}
        {showCaseInfo ? (
          <div
            id="case-info-fields"
            className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/40 md:flex md:flex-wrap md:items-center md:gap-x-4 md:gap-y-2 xl:gap-x-5"
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
        ) : null}

        {/* 2行目: 印刷と出力だけをまとめる */}
        <div className="mt-2 flex items-center justify-start gap-2 border-t border-slate-100 pt-2 dark:border-slate-700/70">
          <div className="flex items-center gap-1.5">
            {/* 印刷の設定（両方の選択肢を並べ、今の設定に色を付ける） */}
            <div className="hidden sm:flex items-center gap-1.5">
              {/* 見出しは xl 以上だけ（lg では出力ボタンと並べると幅が足りず、ボタンの文字が2行に折れる） */}
              <span className="hidden xl:inline text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">印刷</span>
              {PRINT_SETTINGS.map((setting) => <PrintSettingSegment key={setting.id} setting={setting} />)}
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
                      <label className={`flex items-center px-2 xl:px-2.5 py-1 text-xs rounded cursor-pointer whitespace-nowrap ${action.colorClass}`}>
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
                    <button onClick={action.onClick} className={`flex items-center px-2 xl:px-2.5 py-1 text-xs rounded whitespace-nowrap ${action.colorClass}`} aria-label={action.label}>
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
                  {/* 印刷設定（モバイル。sm 未満はツールバーに出ないのでここで選ぶ） */}
                  <div className="px-4 py-1.5 space-y-2">
                    {PRINT_SETTINGS.map((setting) => (
                      <div key={setting.id} className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{setting.label}</span>
                        <PrintSettingSegment setting={setting} large />
                      </div>
                    ))}
                  </div>
                  <hr className="my-1 border-slate-200 dark:border-slate-700" />
                  <button type="button" onClick={() => { onExpandAll(true); setShowMobileMenu(false); }} className="flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700">
                    <ChevronsUpDown className="h-4 w-4" aria-hidden="true" />すべて展開
                  </button>
                  <button type="button" onClick={() => { onExpandAll(false); setShowMobileMenu(false); }} className="flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700">
                    <ChevronsDownUp className="h-4 w-4" aria-hidden="true" />すべて折りたたみ
                  </button>
                  <button type="button" onClick={() => { onOpenTrash(); setShowMobileMenu(false); }} className="flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />ゴミ箱{trashCount > 0 ? `（${trashCount}件）` : ''}
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
