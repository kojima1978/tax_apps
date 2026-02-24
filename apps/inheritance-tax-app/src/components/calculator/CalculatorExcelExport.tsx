import React, { memo, useCallback } from 'react';
import type { DetailedTaxCalculationResult, HeirComposition, SpouseAcquisitionMode } from '../../types';
import { formatCurrency, formatPercent, formatFraction, getHeirInfo, getScenarioName, getSpouseModeLabel } from '../../utils';
import { BASIC_DEDUCTION } from '../../constants';
import { FILLS, ALL_THIN_BORDERS, ALL_GREEN_BORDERS, setupExcelWorkbook, addSectionHeader, addLabelValueRow, applyTableHeaderStyle, saveWorkbook } from '../../utils/excelStyles';
import { useExcelExport } from '../../hooks/useExcelExport';
import { useStaffInfo } from '../../contexts/StaffContext';
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
  const { staffName, staffPhone } = useStaffInfo();

  const exportFn = useCallback(async () => {
    const ExcelJS = await import('exceljs');

    const colCount = 6;
    const { workbook, worksheet } = setupExcelWorkbook({
      ExcelJS,
      sheetName: '相続税計算結果',
      title: '相続税計算結果',
      colCount,
      pageSetup: { paperSize: 9, orientation: 'portrait' },
      staffInfo: { name: staffName, phone: staffPhone },
    });

    // --- 入力条件セクション ---
    addSectionHeader(worksheet, colCount, '入力条件');

    const { totalHeirsCount } = getHeirInfo(composition);
    addLabelValueRow(worksheet, colCount, '遺産総額', formatCurrency(result.estateValue));
    addLabelValueRow(worksheet, colCount, '法定相続人数', `${totalHeirsCount}人`);
    addLabelValueRow(worksheet, colCount, '基礎控除額', `${formatCurrency(BASIC_DEDUCTION.BASE)} + ${formatCurrency(BASIC_DEDUCTION.PER_HEIR)} × ${totalHeirsCount}人 = ${formatCurrency(result.basicDeduction)}`);
    addLabelValueRow(worksheet, colCount, '課税遺産総額', formatCurrency(result.taxableAmount));
    addLabelValueRow(worksheet, colCount, '配偶者の取得', composition.hasSpouse ? getSpouseModeLabel(spouseMode) : '配偶者なし');

    worksheet.addRow([]);

    // --- 計算結果サマリー ---
    addSectionHeader(worksheet, colCount, '計算結果');
    addLabelValueRow(worksheet, colCount, '相続税の総額', formatCurrency(result.totalTax));
    addLabelValueRow(worksheet, colCount, '納付税額合計', formatCurrency(result.totalFinalTax));
    addLabelValueRow(worksheet, colCount, '実効税率', formatPercent(result.effectiveTaxRate));

    worksheet.addRow([]);

    // --- 相続人別内訳テーブル ---
    addSectionHeader(worksheet, colCount, '相続人別内訳');

    const tableHeaders = ['相続人', '法定相続分', '取得額', '按分税額', '加算/控除', '納付税額'];
    const headerRow = worksheet.addRow(tableHeaders);
    applyTableHeaderStyle(headerRow, 22);

    // データ行
    result.heirBreakdowns.forEach((b) => {
      const adjustment = b.type === 'spouse'
        ? (b.spouseDeduction > 0 ? `−${formatCurrency(b.spouseDeduction)}` : '−')
        : (b.surchargeAmount > 0 ? `+${formatCurrency(b.surchargeAmount)}` : '−');

      const dataRow = worksheet.addRow([
        b.label,
        formatFraction(b.legalShareRatio),
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
    await saveWorkbook(workbook, `相続税計算_${getScenarioName(composition)}_${formatCurrency(result.estateValue)}.xlsx`);
  }, [result, composition, spouseMode, staffName, staffPhone]);

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
