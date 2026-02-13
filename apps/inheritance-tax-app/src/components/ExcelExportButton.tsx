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
  <div>
    <button
      onClick={onClick}
      disabled={disabled || isExporting}
      aria-busy={isExporting}
      aria-label="Excelファイルをダウンロード"
      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md transition-colors"
    >
      {isExporting ? (
        <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="w-5 h-5" aria-hidden="true" />
      )}
      {isExporting ? 'エクスポート中...' : 'Excelダウンロード'}
    </button>
    {error && (
      <p className="mt-2 text-sm text-red-600" role="alert">
        {error}
      </p>
    )}
  </div>
);
