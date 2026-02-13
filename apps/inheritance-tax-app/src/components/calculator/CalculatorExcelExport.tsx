import React, { memo, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { DetailedTaxCalculationResult, HeirComposition, SpouseAcquisitionMode } from '../../types';
import { formatCurrency, formatPercent, getHeirInfo } from '../../utils';
import { COMPANY_INFO, BASIC_DEDUCTION } from '../../constants';

// Excel スタイル定数（ExcelExport.tsx と同一）
const solidFill = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } });
const FILLS = {
  mainHeader: solidFill('FF16A34A'),
  subHeader: solidFill('FF22C55E'),
  totalRow: solidFill('FFF0FDF4'),
};
const GREEN_BORDER = { style: 'medium' as const, color: { argb: 'FF16A34A' } };
const THIN_BORDER = { style: 'thin' as const, color: { argb: 'FFD1D5DB' } };
const ALL_THIN_BORDERS = { top: THIN_BORDER, left: THIN_BORDER, bottom: THIN_BORDER, right: THIN_BORDER };
const ALL_GREEN_BORDERS = { top: GREEN_BORDER, left: GREEN_BORDER, bottom: GREEN_BORDER, right: GREEN_BORDER };

interface CalculatorExcelExportProps {
  result: DetailedTaxCalculationResult;
  composition: HeirComposition;
  spouseMode: SpouseAcquisitionMode;
}

const getSpouseModeLabel = (mode: SpouseAcquisitionMode): string => {
  switch (mode.mode) {
    case 'legal': return '法定相続分';
    case 'limit160m': return '1億6,000万円';
    case 'custom': return `${mode.value.toLocaleString()}万円（カスタム）`;
  }
};

export const CalculatorExcelExport: React.FC<CalculatorExcelExportProps> = memo(({
  result,
  composition,
  spouseMode,
}) => {
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

      const worksheet = workbook.addWorksheet('相続税計算結果', {
        pageSetup: {
          paperSize: 9, // A4
          orientation: 'portrait',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
        },
      });

      const colCount = 6;

      // --- タイトル行 ---
      worksheet.mergeCells(1, 1, 1, colCount);
      const titleCell = worksheet.getCell('A1');
      titleCell.value = '相続税計算結果';
      titleCell.font = { size: 18, bold: true, color: { argb: 'FF16A34A' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(1).height = 30;

      // --- 企業情報行 ---
      worksheet.mergeCells(2, 1, 2, colCount);
      const companyCell = worksheet.getCell('A2');
      companyCell.value = COMPANY_INFO.fullLine;
      companyCell.font = { size: 10, color: { argb: 'FF666666' } };
      companyCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(2).height = 20;

      // --- 空行 ---
      worksheet.addRow([]);

      // --- 入力条件セクション ---
      const applyLabelStyle = (cell: ReturnType<typeof worksheet.getCell>) => {
        cell.font = { bold: true, size: 11 };
        cell.fill = solidFill('FFF3F4F6');
        cell.border = ALL_THIN_BORDERS;
        cell.alignment = { vertical: 'middle' };
      };
      const applyValueStyle = (cell: ReturnType<typeof worksheet.getCell>) => {
        cell.font = { size: 11 };
        cell.border = ALL_THIN_BORDERS;
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      };

      // セクションヘッダー: 入力条件
      worksheet.mergeCells(4, 1, 4, colCount);
      const condHeaderCell = worksheet.getCell('A4');
      condHeaderCell.value = '入力条件';
      condHeaderCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      condHeaderCell.fill = FILLS.mainHeader;
      condHeaderCell.alignment = { vertical: 'middle', horizontal: 'center' };
      condHeaderCell.border = ALL_GREEN_BORDERS;
      worksheet.getRow(4).height = 25;

      const { totalHeirsCount } = getHeirInfo(composition);
      const conditionItems = [
        ['遺産総額', formatCurrency(result.estateValue)],
        ['法定相続人数', `${totalHeirsCount}人`],
        ['基礎控除額', `${formatCurrency(BASIC_DEDUCTION.BASE)} + ${formatCurrency(BASIC_DEDUCTION.PER_HEIR)} × ${totalHeirsCount}人 = ${formatCurrency(result.basicDeduction)}`],
        ['課税遺産総額', formatCurrency(result.taxableAmount)],
        ['配偶者の取得', composition.hasSpouse ? getSpouseModeLabel(spouseMode) : '配偶者なし'],
      ];

      conditionItems.forEach(([label, value]) => {
        const row = worksheet.addRow([]);
        worksheet.mergeCells(row.number, 1, row.number, 2);
        worksheet.mergeCells(row.number, 3, row.number, colCount);
        const labelCell = worksheet.getCell(`A${row.number}`);
        labelCell.value = label;
        applyLabelStyle(labelCell);
        // merged cell B also needs border
        worksheet.getCell(`B${row.number}`).border = ALL_THIN_BORDERS;
        const valCell = worksheet.getCell(`C${row.number}`);
        valCell.value = value;
        applyValueStyle(valCell);
        // merged cells D-F also need border
        for (let c = 4; c <= colCount; c++) {
          worksheet.getCell(row.number, c).border = ALL_THIN_BORDERS;
        }
      });

      // --- 空行 ---
      worksheet.addRow([]);

      // --- 計算結果サマリー ---
      const summaryHeaderRowNum = worksheet.rowCount + 1;
      worksheet.mergeCells(summaryHeaderRowNum, 1, summaryHeaderRowNum, colCount);
      const summaryHeaderCell = worksheet.getCell(`A${summaryHeaderRowNum}`);
      summaryHeaderCell.value = '計算結果';
      summaryHeaderCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      summaryHeaderCell.fill = FILLS.mainHeader;
      summaryHeaderCell.alignment = { vertical: 'middle', horizontal: 'center' };
      summaryHeaderCell.border = ALL_GREEN_BORDERS;
      worksheet.getRow(summaryHeaderRowNum).height = 25;

      const summaryItems = [
        ['相続税の総額', formatCurrency(result.totalTax)],
        ['納付税額合計', formatCurrency(result.totalFinalTax)],
        ['実効税率', formatPercent(result.effectiveTaxRate)],
      ];

      summaryItems.forEach(([label, value]) => {
        const row = worksheet.addRow([]);
        worksheet.mergeCells(row.number, 1, row.number, 2);
        worksheet.mergeCells(row.number, 3, row.number, colCount);
        const labelCell = worksheet.getCell(`A${row.number}`);
        labelCell.value = label;
        applyLabelStyle(labelCell);
        worksheet.getCell(`B${row.number}`).border = ALL_THIN_BORDERS;
        const valCell = worksheet.getCell(`C${row.number}`);
        valCell.value = value;
        applyValueStyle(valCell);
        for (let c = 4; c <= colCount; c++) {
          worksheet.getCell(row.number, c).border = ALL_THIN_BORDERS;
        }
      });

      // --- 空行 ---
      worksheet.addRow([]);

      // --- 相続人別内訳テーブル ---
      const breakdownHeaderRowNum = worksheet.rowCount + 1;
      worksheet.mergeCells(breakdownHeaderRowNum, 1, breakdownHeaderRowNum, colCount);
      const breakdownHeaderCell = worksheet.getCell(`A${breakdownHeaderRowNum}`);
      breakdownHeaderCell.value = '相続人別内訳';
      breakdownHeaderCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      breakdownHeaderCell.fill = FILLS.mainHeader;
      breakdownHeaderCell.alignment = { vertical: 'middle', horizontal: 'center' };
      breakdownHeaderCell.border = ALL_GREEN_BORDERS;
      worksheet.getRow(breakdownHeaderRowNum).height = 25;

      // テーブルヘッダー
      const tableHeaders = ['相続人', '法定相続分', '取得額', '按分税額', '加算/控除', '納付税額'];
      const headerRow = worksheet.addRow(tableHeaders);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = FILLS.subHeader;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = ALL_GREEN_BORDERS;
      });
      headerRow.height = 22;

      // データ行
      result.heirBreakdowns.forEach((b) => {
        const adjustment = b.type === 'spouse'
          ? (b.spouseDeduction > 0 ? `−${formatCurrency(b.spouseDeduction)}` : '−')
          : (b.surchargeAmount > 0 ? `+${formatCurrency(b.surchargeAmount)}` : '−');

        const dataRow = worksheet.addRow([
          b.label,
          `${(b.legalShareRatio * 100).toFixed(1)}%`,
          formatCurrency(b.acquisitionAmount),
          formatCurrency(b.proportionalTax),
          adjustment,
          formatCurrency(b.finalTax),
        ]);

        dataRow.eachCell((cell, colNumber) => {
          cell.font = { size: 10 };
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : 'right' };
          cell.border = ALL_THIN_BORDERS;
        });
        dataRow.height = 20;
      });

      // 合計行
      const totalRow = worksheet.addRow([
        '合計',
        '',
        '',
        '',
        '',
        formatCurrency(result.totalFinalTax),
      ]);
      totalRow.eachCell((cell, colNumber) => {
        cell.font = { size: 11, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : 'right' };
        cell.fill = FILLS.totalRow;
        cell.border = ALL_GREEN_BORDERS;
      });
      totalRow.height = 22;

      // --- 列幅 ---
      worksheet.columns = [
        { width: 16 },
        { width: 14 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
        { width: 18 },
      ];

      // --- フッター ---
      worksheet.headerFooter.oddFooter = `&C${COMPANY_INFO.footerLine}`;

      // --- ファイル生成 ---
      const fileName = `相続税計算_${getScenarioName()}_${formatCurrency(result.estateValue)}.xlsx`;
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
    <div>
      <button
        onClick={handleExport}
        disabled={isExporting}
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

CalculatorExcelExport.displayName = 'CalculatorExcelExport';
