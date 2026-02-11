import React, { memo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { TaxCalculationResult, HeirComposition } from '../types';
import { formatCurrency, formatPercent, getHeirInfo } from '../utils';
import { isHighlightRow, COMPANY_INFO } from '../constants';

// Excel スタイル定数
const solidFill = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } });
const FILLS = {
  mainHeader: solidFill('FF16A34A'),
  subHeader: solidFill('FF22C55E'),
  highlight: solidFill('FFFEF3C7'),
  alternate: solidFill('FFF0FDF4'),
};
const GREEN_BORDER = { style: 'medium' as const, color: { argb: 'FF16A34A' } };
const THIN_BORDER = { style: 'thin' as const, color: { argb: 'FFD1D5DB' } };
const ALL_THIN_BORDERS = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };
const ALL_GREEN_BORDERS = { top: GREEN_BORDER, left: GREEN_BORDER, bottom: GREEN_BORDER, right: GREEN_BORDER };

interface ExcelExportProps {
  data: TaxCalculationResult[];
  composition: HeirComposition;
}

export const ExcelExport: React.FC<ExcelExportProps> = memo(({
  data,
  composition,
}) => {
  const hasSpouse = composition.hasSpouse;
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getScenarioName = (): string => {
    const parts: string[] = [];
    if (composition.hasSpouse) parts.push('配偶者あり');

    const { rank, rankHeirsCount } = getHeirInfo(composition);
    const rankLabels: Record<number, string> = { 1: '子', 2: '直系尊属', 3: '兄弟姉妹' };
    if (rank > 0 && rankHeirsCount > 0) parts.push(`${rankLabels[rank]}${rankHeirsCount}人`);

    return parts.join('_') || '相続人なし';
  };

  const handleExport = async () => {
    if (data.length === 0) {
      setError('データがありません');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const [ExcelJS, { saveAs }] = await Promise.all([
        import('exceljs').then(m => m.default),
        import('file-saver'),
      ]);

      const workbook = new ExcelJS.Workbook();
      workbook.creator = COMPANY_INFO.name;
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('相続税早見表', {
        pageSetup: {
          paperSize: 9, // A3
          orientation: 'landscape',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
        },
      });

      // タイトル行を追加
      worksheet.mergeCells('A1:F1');
      const titleCell = worksheet.getCell('A1');
      titleCell.value = '相続税早見表';
      titleCell.font = { size: 18, bold: true, color: { argb: 'FF16A34A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 30;

      // 企業情報行
      worksheet.mergeCells('A2:F2');
      const companyCell = worksheet.getCell('A2');
      companyCell.value = COMPANY_INFO.fullLine;
      companyCell.font = { size: 10, color: { argb: 'FF666666' } };
      companyCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(2).height = 20;

      // 空行
      worksheet.addRow([]);

      // ヘッダーセルの共通スタイル適用
      const applyMainHeaderStyle = (cell: ReturnType<typeof worksheet.getCell>) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
        cell.fill = FILLS.mainHeader;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = ALL_GREEN_BORDERS;
      };

      // メインヘッダー（1次相続・2次相続）
      if (hasSpouse) {
        worksheet.mergeCells('A4:A5');
        worksheet.getCell('A4').value = '相続財産';
        worksheet.mergeCells('B4:D4');
        worksheet.getCell('B4').value = '1次相続（配偶者あり）';
        worksheet.mergeCells('E4:F4');
        worksheet.getCell('E4').value = '2次相続（配偶者なし）';
        ['A4', 'B4', 'E4'].forEach(ref => applyMainHeaderStyle(worksheet.getCell(ref)));

        // サブヘッダー
        const subHeaders = ['相続財産', '相続税額', '実効税率', '配偶者控除後', '相続税額', '実効税率'];
        const subHeaderRow = worksheet.getRow(5);
        subHeaders.forEach((header, index) => {
          const cell = subHeaderRow.getCell(index + 1);
          cell.value = header;
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
          cell.fill = FILLS.subHeader;
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: GREEN_BORDER, right: { style: 'thin' } };
        });
        worksheet.getRow(5).height = 25;
      } else {
        const headers = ['相続財産', '相続税額', '実効税率'];
        const headerRow = worksheet.getRow(4);
        headers.forEach((header, index) => {
          const cell = headerRow.getCell(index + 1);
          cell.value = header;
          applyMainHeaderStyle(cell);
        });
        worksheet.getRow(4).height = 25;
      }

      // データ行を追加
      data.forEach((row, index) => {
        const rowData = hasSpouse
          ? [
              formatCurrency(row.estateValue),
              formatCurrency(row.totalTax),
              formatPercent(row.effectiveTaxRate),
              formatCurrency(row.taxAfterSpouseDeduction),
              formatCurrency(row.taxAfterSpouseDeduction),
              formatPercent(row.effectiveTaxRateAfterSpouse),
            ]
          : [
              formatCurrency(row.estateValue),
              formatCurrency(row.totalTax),
              formatPercent(row.effectiveTaxRate),
            ];

        const dataRow = worksheet.addRow(rowData);
        const isHighlight = isHighlightRow(row.estateValue);
        const isAlternate = index % 2 === 0;

        dataRow.eachCell((cell, colNumber) => {
          cell.font = { size: 10, bold: colNumber === 1 };
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : 'right' };
          if (isHighlight) cell.fill = FILLS.highlight;
          else if (isAlternate) cell.fill = FILLS.alternate;
          cell.border = ALL_THIN_BORDERS;
        });
        dataRow.height = 20;
      });

      // 列幅の調整
      worksheet.columns = [
        { width: 22 },
        { width: 20 },
        { width: 14 },
        { width: 20 },
        { width: 20 },
        { width: 14 },
      ];

      // フッター
      worksheet.headerFooter.oddFooter = `&C${COMPANY_INFO.footerLine}`;

      // ファイル名の生成
      const fileName = `相続税早見表_${getScenarioName()}.xlsx`;

      // ファイルを生成してダウンロード
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      saveAs(blob, fileName);
    } catch (err) {
      console.error('Excel export error:', err);
      setError('Excelファイルの生成に失敗しました。もう一度お試しください。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="no-print">
      <button
        onClick={handleExport}
        disabled={data.length === 0 || isExporting}
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
});

ExcelExport.displayName = 'ExcelExport';
