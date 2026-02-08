import { AlertTriangle, Trash2, Upload, XCircle } from 'lucide-react';
import type { ExportData } from '@/utils/jsonExportImport';

// ─── 共通ダイアログオーバーレイ ───

type DialogOverlayProps = {
  labelledBy: string;
  onClose: () => void;
  role?: 'dialog' | 'alertdialog';
  maxWidth?: string;
  children: React.ReactNode;
};

const DialogOverlay = ({ labelledBy, onClose, role = 'dialog', maxWidth = 'max-w-md', children }: DialogOverlayProps) => (
  <div
    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in"
    role={role}
    aria-modal="true"
    aria-labelledby={labelledBy}
    onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    onClick={onClose}
  >
    <div className={`bg-white rounded-xl shadow-2xl p-6 ${maxWidth} mx-4`} onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

// ─── 共通ダイアログヘッダー ───

type DialogHeaderProps = {
  titleId: string;
  title: string;
  icon: React.ReactNode;
  iconBgClass: string;
};

const DialogHeader = ({ titleId, title, icon, iconBgClass }: DialogHeaderProps) => (
  <div className="flex items-center gap-3 mb-4">
    <div className={`w-12 h-12 ${iconBgClass} rounded-full flex items-center justify-center`}>
      {icon}
    </div>
    <h3 id={titleId} className="text-xl font-bold text-slate-800">{title}</h3>
  </div>
);

// ─── 共通ダイアログボタン ───

const cancelBtnClass = 'px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium';

type DialogButtonsProps = {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmClass: string;
};

const DialogButtons = ({ onCancel, onConfirm, confirmLabel, confirmClass }: DialogButtonsProps) => (
  <div className="flex justify-end gap-3">
    <button onClick={onCancel} className={cancelBtnClass} autoFocus>
      キャンセル
    </button>
    <button onClick={onConfirm} className={`px-5 py-2 text-white rounded-lg transition-colors font-medium ${confirmClass}`}>
      {confirmLabel}
    </button>
  </div>
);

// ─── 削除確認ダイアログ ───

type DeleteConfirmDialogProps = {
  message: string;
  subMessage?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export const DeleteConfirmDialog = ({ message, subMessage, onConfirm, onCancel }: DeleteConfirmDialogProps) => (
  <DialogOverlay labelledBy="delete-dialog-title" onClose={onCancel}>
    <DialogHeader
      titleId="delete-dialog-title"
      title={message}
      icon={<Trash2 className="w-6 h-6 text-red-600" aria-hidden="true" />}
      iconBgClass="bg-red-100"
    />
    {subMessage && (
      <p className="mb-6 pl-15 text-sm text-slate-500">{subMessage}</p>
    )}
    <DialogButtons onCancel={onCancel} onConfirm={onConfirm} confirmLabel="削除" confirmClass="bg-red-500 hover:bg-red-600" />
  </DialogOverlay>
);

// ─── リセット確認ダイアログ ───

type ResetConfirmDialogProps = {
  onConfirm: () => void;
  onCancel: () => void;
};

export const ResetConfirmDialog = ({ onConfirm, onCancel }: ResetConfirmDialogProps) => (
  <DialogOverlay labelledBy="reset-dialog-title" onClose={onCancel}>
    <DialogHeader
      titleId="reset-dialog-title"
      title="編集内容をリセットしますか？"
      icon={<AlertTriangle className="w-6 h-6 text-amber-600" aria-hidden="true" />}
      iconBgClass="bg-amber-100"
    />
    <div className="mb-6 pl-15">
      <p className="text-slate-600 mb-3">以下の内容が初期状態に戻ります：</p>
      <ul className="text-sm text-slate-500 space-y-1">
        {['チェック状態', '追加したカテゴリ・書類', '中項目', '並び順'].map((item) => (
          <li key={item} className="flex items-center">
            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full mr-2" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
    <DialogButtons onCancel={onCancel} onConfirm={onConfirm} confirmLabel="リセット" confirmClass="bg-amber-500 hover:bg-amber-600" />
  </DialogOverlay>
);

// ─── インポート確認ダイアログ ───

type ImportConfirmDialogProps = {
  preview: ExportData;
  onConfirm: () => void;
  onCancel: () => void;
};

export const ImportConfirmDialog = ({ preview, onConfirm, onCancel }: ImportConfirmDialogProps) => (
  <DialogOverlay labelledBy="import-dialog-title" onClose={onCancel} maxWidth="max-w-lg">
    <DialogHeader
      titleId="import-dialog-title"
      title="データを取り込みますか？"
      icon={<Upload className="w-6 h-6 text-violet-600" aria-hidden="true" />}
      iconBgClass="bg-violet-100"
    />
    <div className="mb-6">
      <p className="text-slate-600 mb-3">以下のデータが読み込まれます：</p>
      <div className="bg-slate-50 p-4 rounded-lg space-y-2 text-sm">
        {preview.customerName && (
          <p><span className="text-slate-500">お客様名:</span> <span className="font-medium">{preview.customerName}</span></p>
        )}
        {preview.staffName && (
          <p><span className="text-slate-500">担当者:</span> <span className="font-medium">{preview.staffName}</span></p>
        )}
        {preview.staffPhone && (
          <p><span className="text-slate-500">担当者携帯:</span> <span className="font-medium">{preview.staffPhone}</span></p>
        )}
        <p>
          <span className="text-slate-500">カテゴリ数:</span>{' '}
          <span className="font-medium">{preview.documentList.length}</span>
        </p>
        <p>
          <span className="text-slate-500">書類数:</span>{' '}
          <span className="font-medium">
            {preview.documentList.reduce((acc, cat) => acc + cat.documents.length, 0)}
          </span>
        </p>
        {preview.exportedAt && (
          <p>
            <span className="text-slate-500">エクスポート日時:</span>{' '}
            <span className="font-medium">
              {new Date(preview.exportedAt).toLocaleString('ja-JP')}
            </span>
          </p>
        )}
      </div>
      <p className="mt-3 text-sm text-amber-600">
        ※現在の編集内容は上書きされます
      </p>
    </div>
    <DialogButtons onCancel={onCancel} onConfirm={onConfirm} confirmLabel="取り込む" confirmClass="bg-violet-600 hover:bg-violet-700" />
  </DialogOverlay>
);

// ─── インポートエラーダイアログ ───

type ImportErrorDialogProps = {
  onDismiss: () => void;
};

export const ImportErrorDialog = ({ onDismiss }: ImportErrorDialogProps) => (
  <DialogOverlay labelledBy="import-error-dialog-title" onClose={onDismiss} role="alertdialog">
    <DialogHeader
      titleId="import-error-dialog-title"
      title="読み込みに失敗しました"
      icon={<XCircle className="w-6 h-6 text-red-600" aria-hidden="true" />}
      iconBgClass="bg-red-100"
    />
    <p className="mb-6 pl-15 text-sm text-slate-500">
      JSONファイルの形式を確認してください。
    </p>
    <div className="flex justify-end">
      <button
        onClick={onDismiss}
        className="px-5 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
        autoFocus
      >
        閉じる
      </button>
    </div>
  </DialogOverlay>
);
