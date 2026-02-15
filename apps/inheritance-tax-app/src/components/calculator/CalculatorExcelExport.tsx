import React, { memo, useCallback } from 'react';
import type { DetailedTaxCalculationResult, HeirComposition, SpouseAcquisitionMode } from '../../types';
import { formatCurrency, formatPercent, getHeirInfo, getScenarioName, getSpouseModeLabel } from '../../utils';
import { BASIC_DEDUCTION } from '../../constants';
import { solidFill, FILLS, ALL_THIN_BORDERS, ALL_GREEN_BORDERS, applyMainHeaderStyle, setupExcelWorkbook } from '../../utils/excelStyles';
import { useExcelExport } from '../../hooks/useExcelExport';
import { ExcelExportButton } from '../ExcelExportButton';

interface CalculatorExcelExportProps {
  result: DetailedTaxCalculationResult;
  composition: HeirComposition;
  spouseMode: SpouseAcquisitionMode;
}

export const CalculatorExcelExport: React.FC<CalculatorExcelExportProps> = memo(({
  result,
  composition,
  spouseMode,
}) => {
  const exportFn = useCallback(async () => {
    const [ExcelJS, { saveAs }] = await Promise.all([
      import('exceljs'),
      import('file-saver'),
    ]);

    const colCount = 6;
    const { workbook, worksheet } = setupExcelWorkbook({
      ExcelJS,
      sheetName: '相続税計算結果',
      title: '相続税計算結果',
      colCount,
      pageSetup: { paperSize: 9, orientation: 'portrait' },
    });

    // --- ヘルパー関数 ---
    const addSectionHeader = (title: string) => {
      const rowNum = worksheet.rowCount + 1;
      worksheet.mergeCells(rowNum, 1, rowNum, colCount);
      const cell = worksheet.getCell(`A${rowNum}`);
      cell.value = title;
      applyMainHeaderStyle(cell);
      worksheet.getRow(rowNum).height = 25;
    };

    const addLabelValueRow = (label: string, value: string) => {
      const row = worksheet.addRow([]);
      worksheet.mergeCells(row.number, 1, row.number, 2);
      worksheet.mergeCells(row.number, 3, row.number, colCount);
      const lCell = worksheet.getCell(`A${row.number}`);
      lCell.value = label;
      lCell.font = { bold: true, size: 11 };
      lCell.fill = solidFill('FFF3F4F6');
      lCell.border = ALL_THIN_BORDERS;
      lCell.alignment = { vertical: 'middle' };
      worksheet.getCell(`B${row.number}`).border = ALL_THIN_BORDERS;
      const vCell = worksheet.getCell(`C${row.number}`);
      vCell.value = value;
      vCell.font = { size: 11 };
      vCell.border = ALL_THIN_BORDERS;
      vCell.alignment = { vertical: 'middle', horizontal: 'right' };
      for (let c = 4; c <= colCount; c++) {
        worksheet.getCell(row.number, c).border = ALL_THIN_BORDERS;
      }
    };

    // --- 入力条件セクション ---
    addSectionHeader('入力条件');

    const { totalHeirsCount } = getHeirInfo(composition);
    addLabelValueRow('遺産総額', formatCurrency(result.estateValue));
    addLabelValueRow('法定相続人数', `${totalHeirsCount}人`);
    addLabelValueRow('基礎控除額', `${formatCurrency(BASIC_DEDUCTION.BASE)} + ${formatCurrency(BASIC_DEDUCTION.PER_HEIR)} × ${totalHeirsCount}人 = ${formatCurrency(result.basicDeduction)}`);
    addLabelValueRow('課税遺産総額', formatCurrency(result.taxableAmount));
    addLabelValueRow('配偶者の取得', composition.hasSpouse ? getSpouseModeLabel(spouseMode) : '配偶者なし');

    // --- 空行 ---
    worksheet.addRow([]);

    // --- 計算結果サマリー ---
    addSectionHeader('計算結果');
    addLabelValueRow('相続税の総額', formatCurrency(result.totalTax));
    addLabelValueRow('納付税額合計', formatCurrency(result.totalFinalTax));
    addLabelValueRow('実効税率', formatPercent(result.effectiveTaxRate));

    // --- 空行 ---
    worksheet.addRow([]);

    // --- 相続人別内訳テーブル ---
    addSectionHeader('相続人別内訳');

    // テーブルヘッダー
    const tableHeaders = ['相続人', '法定相続分', '取得額', '按分税額', '加算/控除', '納付税額'];
    const headerRow = worksheet.addRow(tableHeaders);
    headerRow.eachCell((cell: any) => {
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

      dataRow.eachCell((cell: any, colNumber: number) => {
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
    totalRow.eachCell((cell: any, colNumber: number) => {
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

    // --- ファイル生成 ---
    const fileName = `相続税計算_${getScenarioName(composition)}_${formatCurrency(result.estateValue)}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, fileName);
  }, [result, composition, spouseMode]);

  const { isExporting, error, handleExport } = useExcelExport(exportFn);

  return (
    <ExcelExportButton
      onClick={handleExport}
      isExporting={isExporting}
      error={error}
    />
  );
});

CalculatorExcelExport.displayName = 'CalculatorExcelExport';
