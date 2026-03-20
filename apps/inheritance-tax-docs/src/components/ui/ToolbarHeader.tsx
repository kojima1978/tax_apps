import { memo } from 'react';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, FileDown, Download, Upload, RotateCcw, Home } from 'lucide-react';
import type { PageConfig } from '../../constants/pageConfig';

const TOOLBAR_BTN = 'flex items-center px-4 py-2 rounded-lg text-white shadow font-bold text-sm';

interface ToolbarHeaderProps {
  title: string;
  subtitle: string;
  navLinks: PageConfig['navLinks'];
  isDirty: boolean;
  lastSavedAt: string | null;
  hasCustomizations: boolean;
  isExporting: boolean;
  isImporting: boolean;
  onSave: () => void;
  onExcelExport: () => void;
  onReset: () => void;
  onJsonImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ToolbarHeader = memo(function ToolbarHeader({
  title, subtitle, navLinks, isDirty, lastSavedAt, hasCustomizations,
  isExporting, isImporting, onSave, onExcelExport, onReset, onJsonImport,
}: ToolbarHeaderProps) {
  const toolbarActions = [
    { id: 'save', icon: Download, label: lastSavedAt ? `保存 (${lastSavedAt})` : '保存', badge: isDirty ? '未保存' : null, onClick: onSave, disabled: false, title: '設定をJSONファイルとして保存 (Ctrl+S)', bg: isDirty ? 'bg-amber-500/80 hover:bg-amber-500' : 'bg-white/15 hover:bg-white/25 backdrop-blur-sm' },
    { id: 'excel', icon: FileSpreadsheet, label: isExporting ? '出力中...' : 'Excel', badge: null, onClick: onExcelExport, disabled: isExporting, title: 'Excelファイルに出力 (Ctrl+E)', bg: `bg-emerald-500/80 hover:bg-emerald-500 ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}` },
    { id: 'print', icon: FileDown, label: '印刷', badge: null, onClick: () => window.print(), disabled: false, title: '印刷', bg: 'bg-white/15 hover:bg-white/25 backdrop-blur-sm' },
    { id: 'reset', icon: RotateCcw, label: '初期化', badge: null, onClick: onReset, disabled: !hasCustomizations, title: '書類のカスタマイズをすべて初期状態に戻す', bg: hasCustomizations ? 'bg-white/15 hover:bg-white/25 backdrop-blur-sm' : 'bg-white/5 cursor-not-allowed opacity-50' },
  ] as const;

  return (
    <header className="header-gradient text-white no-print">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <a href="/" title="ポータルに戻る" aria-label="ポータルに戻る" className="opacity-70 hover:opacity-100 transition-opacity">
            <Home className="w-6 h-6" aria-hidden="true" />
          </a>
          <div>
            <h1 className="text-2xl font-bold mb-1">{title}</h1>
            <p className="text-emerald-200 text-sm">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {toolbarActions.map(({ id, icon: Icon, label, badge, onClick, disabled, title: btnTitle, bg }) => (
            <button key={id} onClick={onClick} disabled={disabled} title={btnTitle} className={`${TOOLBAR_BTN} ${bg}`}>
              <Icon className="w-4 h-4 mr-1" /> {label}
              {badge && <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-400 text-amber-900 rounded-full font-bold">{badge}</span>}
            </button>
          ))}
          <label
            className={`${TOOLBAR_BTN} cursor-pointer ${
              isImporting ? 'bg-slate-400 cursor-not-allowed' : 'bg-white/15 hover:bg-white/25 backdrop-blur-sm'
            }`}
            title="JSONファイルから設定を読み込み"
          >
            <Upload className="w-4 h-4 mr-1" /> 読込
            <input type="file" accept=".json" onChange={onJsonImport} disabled={isImporting} className="hidden" />
          </label>
          {navLinks.map(({ to, label: linkLabel, icon: NavIcon }) => (
            <Link key={to} to={to} className={`${TOOLBAR_BTN} bg-indigo-500/80 hover:bg-indigo-500`} title={linkLabel}>
              <NavIcon className="w-4 h-4 mr-1" /> {linkLabel}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
});
