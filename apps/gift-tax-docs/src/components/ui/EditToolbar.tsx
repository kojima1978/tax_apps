'use client';

import {
  ChevronUp,
  Printer,
  FileSpreadsheet,
  RefreshCw,
  ChevronsUpDown,
  RotateCcw,
  Download,
  Upload,
  Home,
} from 'lucide-react';
import { giftData, type Step } from '@/constants';

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
      <label className={`${baseClass} cursor-pointer`} title={title}>
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
  onPreview: () => void;
  onExcelExport: () => void;
  onResetToMenu: () => void;
};

// ─── ツールバーコンポーネント ───

export const EditToolbar = ({
  checkedCount,
  totalCount,
  onExpandAll,
  onShowResetDialog,
  onJsonExport,
  onFileSelect,
  onPreview,
  onExcelExport,
  onResetToMenu,
}: EditToolbarProps) => (
  <div className="no-print bg-white rounded-xl shadow-lg p-4 mb-6 sticky top-4 z-10" role="toolbar" aria-label="編集ツールバー">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <a href="/" title="ポータルに戻る" className="text-slate-400 hover:text-emerald-600 transition-colors">
          <Home className="w-5 h-5" />
        </a>
        <h1 className="text-xl font-bold text-slate-800">{giftData.title}</h1>
        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium" aria-live="polite">
          {checkedCount} / {totalCount} 選択中
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
        <div className="w-px h-6 bg-slate-300 mx-2" aria-hidden="true" />
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
        <div className="w-px h-6 bg-slate-300 mx-2" aria-hidden="true" />
        <ToolbarButton
          onClick={onPreview}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium"
          ariaLabel="印刷プレビューを表示"
          icon={<Printer className="w-4 h-4 mr-2" aria-hidden="true" />}
          label="印刷プレビュー"
        />
        <ToolbarButton
          onClick={onExcelExport}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
          ariaLabel="Excelファイルとして出力"
          icon={<FileSpreadsheet className="w-4 h-4 mr-2" aria-hidden="true" />}
          label="Excel"
        />
        <ToolbarButton
          onClick={onResetToMenu}
          className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg"
          ariaLabel="トップメニューに戻る"
          icon={<RefreshCw className="w-4 h-4" aria-hidden="true" />}
        />
      </div>
    </div>
  </div>
);
