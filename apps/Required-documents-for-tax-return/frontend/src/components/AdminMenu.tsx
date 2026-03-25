import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Upload, Settings, UserPlus, Users, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { getErrorMessage } from '@/utils/error';
import { exportFullBackup, importFullBackup, readJsonFile, validateFullBackupImport, FullBackupExport } from '@/utils/jsonExportImport';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ToastContainer } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';

const ADMIN_LINKS = [
  { href: '/staff/create', icon: UserPlus, label: '担当者登録' },
  { href: '/staff', icon: Edit2, label: '担当者一覧・編集' },
  { href: '/customers', icon: Users, label: 'お客様一覧・編集' },
  { href: '/data-management', icon: Settings, label: '保存データ管理' },
] as const;

interface AdminMenuProps {
  onDataRestored: () => void;
}

export function AdminMenu({ onDataRestored }: AdminMenuProps) {
  const [showAdmin, setShowAdmin] = useState(false);
  const backupFileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importConfirmData, setImportConfirmData] = useState<FullBackupExport | null>(null);
  const { messages: toastMessages, toast, dismiss: dismissToast } = useToast();

  const handleFullExport = async () => {
    setIsExporting(true);
    try {
      await exportFullBackup();
      toast('バックアップをエクスポートしました', 'success');
    } catch (error) {
      toast('バックアップのエクスポートに失敗しました: ' + getErrorMessage(error, ''), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFullImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const rawData = await readJsonFile(file);
      const validation = validateFullBackupImport(rawData);
      if (!validation.isValid) {
        toast(validation.error ?? 'バリデーションエラー', 'error');
        return;
      }
      setImportConfirmData(rawData as FullBackupExport);
    } catch (error) {
      toast('バックアップの復元に失敗しました: ' + getErrorMessage(error, ''), 'error');
    } finally {
      setIsImporting(false);
      if (backupFileInputRef.current) backupFileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importConfirmData) return;
    setImportConfirmData(null);
    setIsImporting(true);
    try {
      const result = await importFullBackup(importConfirmData);
      toast(`復元完了 — 担当者: ${result.staffCount}件 / お客様: ${result.customerCount}件 / 書類: ${result.recordCount}件`, 'success');
      onDataRestored();
    } catch (error) {
      toast('バックアップの復元に失敗しました: ' + getErrorMessage(error, ''), 'error');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="mt-10 border-t border-slate-200 pt-6">
      <button
        onClick={() => setShowAdmin(!showAdmin)}
        className="w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
      >
        <Settings className="w-4 h-4" />
        管理メニュー
        {showAdmin ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {showAdmin && (
        <div className="mt-4 space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {ADMIN_LINKS.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                to={href}
                className="flex flex-col items-center gap-2 p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all text-slate-600 hover:text-emerald-700 group"
              >
                <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium text-center">{label}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={handleFullExport}
              disabled={isExporting}
              className="inline-flex items-center px-4 py-2 text-sm text-slate-600 hover:text-emerald-700 bg-white border border-slate-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'エクスポート中...' : '全データバックアップ'}
            </button>
            <button
              onClick={() => backupFileInputRef.current?.click()}
              disabled={isImporting}
              className="inline-flex items-center px-4 py-2 text-sm text-slate-600 hover:text-amber-700 bg-white border border-slate-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-colors disabled:opacity-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              {isImporting ? '復元中...' : 'バックアップから復元'}
            </button>
            <input
              ref={backupFileInputRef}
              type="file"
              accept=".json"
              onChange={handleFullImport}
              className="hidden"
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={importConfirmData !== null}
        title="バックアップから復元"
        message="既存のデータと重複する場合は上書きされます。復元を実行しますか？"
        confirmLabel="復元"
        variant="danger"
        onConfirm={handleConfirmImport}
        onCancel={() => setImportConfirmData(null)}
      />
      <ToastContainer messages={toastMessages} onDismiss={dismissToast} />
    </div>
  );
}
