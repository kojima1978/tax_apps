'use client';

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
} from 'lucide-react';
import { giftData, EXTERNAL_LINKS } from '@/constants';

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
}: EditToolbarProps) => (
  <div className="no-print bg-white rounded-xl shadow-lg p-4 mb-6 sticky top-4 z-10" role="toolbar" aria-label="編集ツールバー">
    {/* 1行目: タイトル + 編集操作 + JSON */}
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-4">
        <a href="/" title="ポータルに戻る" aria-label="ポータルに戻る" className="text-slate-400 hover:text-emerald-600 transition-colors">
          <Home className="w-5 h-5" aria-hidden="true" />
        </a>
        <h1 className="text-xl font-bold text-slate-800">{giftData.title}</h1>
        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium" aria-live="polite">
          {checkedCount} / {totalCount} 提出済み
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ToolbarButton
          onClick={() => onExpandAll(true)}
          className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg"
          title="全て展開"
          ariaLabel="全カテゴリを展開"
          icon={<ChevronsUpDown className="w-4 h-4 mr-1" aria-hidden="true" />}
          label="展開"
        />
        <ToolbarButton
          onClick={() => onExpandAll(false)}
          className="px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg"
          title="全て折りたたむ"
          ariaLabel="全カテゴリを折りたたむ"
          icon={<ChevronUp className="w-4 h-4 mr-1" aria-hidden="true" />}
          label="折畳"
        />
        <ToolbarButton
          onClick={onShowResetDialog}
          className="px-3 py-2 text-sm bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg"
          title="デフォルトに戻す"
          ariaLabel="編集内容をリセット"
          icon={<RotateCcw className="w-4 h-4 mr-1" aria-hidden="true" />}
          label="リセット"
        />
        <div className="w-px h-6 bg-slate-300 mx-1" aria-hidden="true" />
        <ToolbarButton
          onClick={onJsonExport}
          className="px-3 py-2 text-sm bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg"
          title="JSONで出力"
          ariaLabel="JSONファイルとして出力"
          icon={<Download className="w-4 h-4 mr-1" aria-hidden="true" />}
          label="出力"
        />
        <ToolbarButton
          asLabel
          className="px-3 py-2 text-sm bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg"
          title="JSONを取り込み"
          ariaLabel="JSONファイルを選択"
          icon={<Upload className="w-4 h-4 mr-1" aria-hidden="true" />}
          label="取込"
        >
          <input
            type="file"
            accept=".json"
            onChange={onFileSelect}
            className="hidden"
            aria-label="JSONファイルを選択"
          />
        </ToolbarButton>
      </div>
    </div>
    {/* 2行目: 外部リンク + 印刷設定 + 出力 */}
    <div className="flex flex-wrap items-center justify-end gap-2 mt-2">
      {EXTERNAL_LINK_ITEMS.map(({ key, shortLabel }) => (
        <a
          key={key}
          href={EXTERNAL_LINKS[key].url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600"
          title={EXTERNAL_LINKS[key].label}
        >
          <ExternalLink className="w-4 h-4 mr-1" aria-hidden="true" />
          {shortLabel}
        </a>
      ))}
      <div className="w-px h-6 bg-slate-300 mx-1" aria-hidden="true" />
      <ToolbarButton
        onClick={toggleHideSubmitted}
        className={`px-3 py-2 text-sm rounded-lg font-medium ${
          hideSubmittedInPrint
            ? 'bg-amber-500 text-white hover:bg-amber-600'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
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
        className={`px-3 py-2 text-sm rounded-lg font-medium ${
          isTwoColumnPrint
            ? 'bg-purple-600 text-white hover:bg-purple-700'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
        }`}
        ariaLabel={isTwoColumnPrint ? '1列レイアウトに切り替え' : '2列レイアウトに切り替え'}
        icon={<Layout className="w-4 h-4 mr-1" aria-hidden="true" />}
        label={isTwoColumnPrint ? '2列' : '1列'}
      />
      <div className="w-px h-6 bg-slate-300 mx-1" aria-hidden="true" />
      <ToolbarButton
        onClick={onExcelExport}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
        ariaLabel="Excelファイルとして出力"
        icon={<FileSpreadsheet className="w-4 h-4 mr-2" aria-hidden="true" />}
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
