import React from 'react';
import Download from 'lucide-react/icons/download';
import Loader2 from 'lucide-react/icons/loader-2';

interface ExcelExportButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isExporting: boolean;
  error: string | null;
}

export const ExcelExportButton: React.FC<ExcelExportButtonProps> = ({
  onClick,
  disabled,
  isExporting,
  error,
}) => (
  <>
    <button
      onClick={onClick}
      disabled={disabled || isExporting}
      aria-busy={isExporting}
      aria-label="Excelファイルをダウンロード"
      className="flex items-center gap-1.5 px-3 py-1.5 border border-green-100 text-green-100 rounded text-sm hover:bg-green-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="w-4 h-4" aria-hidden="true" />
      )}
      {isExporting ? '出力中...' : 'Excel'}
    </button>
    {error && (
      <p className="text-xs text-red-300 whitespace-nowrap" role="alert">
        {error}
      </p>
    )}
  </>
);
