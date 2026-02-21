import React, { memo, useCallback } from 'react';
import type { ComparisonRow, HeirComposition } from '../../types';
import { formatCurrency, getScenarioName } from '../../utils';
import { FILLS, ALL_THIN_BORDERS, ALL_GREEN_BORDERS, solidFill, setupExcelWorkbook, addSectionHeader, addLabelValueRow, saveWorkbook } from '../../utils/excelStyles';
import { useExcelExport } from '../../hooks/useExcelExport';
import { ExcelExportButton } from '../ExcelExportButton';

interface ComparisonExcelExportProps {
  data: ComparisonRow[];
  composition: HeirComposition;
  estateValue: number;
  spouseOwnEstate: number;
}

export const ComparisonExcelExport: React.FC<ComparisonExcelExportProps> = memo(({
  data,
  composition,
  estateValue,
  spouseOwnEstate,
}) => {
  const exportFn = useCallback(async () => {
    const ExcelJS = await import('exceljs');

    const colCount = 6;
    const { workbook, worksheet } = setupExcelWorkbook({
      ExcelJS,
      sheetName: '1次2次比較',
      title: '1次相続・2次相続 配偶者取得割合別比較',
      colCount,
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    // --- 入力条件 ---
    addSectionHeader(worksheet, colCount, '入力条件');
    addLabelValueRow(worksheet, colCount, '対象者の相続財産額', formatCurrency(estateValue));
    addLabelValueRow(worksheet, colCount, '配偶者の固有財産額', formatCurrency(spouseOwnEstate));
    addLabelValueRow(worksheet, colCount, '相続人構成', getScenarioName(composition));

    worksheet.addRow([]);

    // --- 比較表 ---
    addSectionHeader(worksheet, colCount, '配偶者取得割合別 税額比較');

    // ヘッダー
    const tableHeaders = ['取得割合', '配偶者取得額', '1次税額', '2次遺産額\n(固有+取得)', '2次税額', '合計税額'];
    const headerRow = worksheet.addRow(tableHeaders);
    headerRow.eachCell((cell: any) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = FILLS.subHeader;
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = ALL_GREEN_BORDERS;
    });
    headerRow.height = 32;

    // 最小合計税額
    const minTotalTax = Math.min(...data.map(r => r.totalTax));

    // データ行
    data.forEach((row) => {
      const isOptimal = row.totalTax === minTotalTax;
      const dataRow = worksheet.addRow([
        `${row.ratio}%`,
        formatCurrency(row.spouseAcquisition),
        formatCurrency(row.firstTax),
        `${formatCurrency(row.secondEstate)}\n(固有${formatCurrency(spouseOwnEstate)}+取得${formatCurrency(row.spouseAcquisition)})`,
        formatCurrency(row.secondTax),
        formatCurrency(row.totalTax),
      ]);

      dataRow.eachCell((cell: any, colNumber: number) => {
        cell.font = { size: 10, bold: isOptimal };
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'center' : 'right', wrapText: colNumber === 4 };
        if (isOptimal) cell.fill = FILLS.highlight;
        cell.border = ALL_THIN_BORDERS;
      });
      dataRow.height = 32;
    });

    // --- 列幅 ---
    worksheet.columns = [
      { width: 12 },
      { width: 18 },
      { width: 18 },
      { width: 28 },
      { width: 18 },
      { width: 18 },
    ];

    // === Sheet 2: 相続人別内訳 ===
    const detailSheet = workbook.addWorksheet('相続人別内訳', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    // タイトル
    detailSheet.mergeCells(1, 1, 1, 7);
    const detailTitle = detailSheet.getCell('A1');
    detailTitle.value = '相続人別 取得額・納付税額 内訳';
    detailTitle.font = { size: 18, bold: true, color: { argb: 'FF16A34A' } };
    detailTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    detailSheet.getRow(1).height = 30;
    detailSheet.addRow([]);

    // 各割合ごとの内訳
    data.forEach((row) => {
      const isOptimal = row.totalTax === minTotalTax;

      // セクションヘッダー
      const secRow = detailSheet.addRow([]);
      const secNum = secRow.number;
      detailSheet.mergeCells(secNum, 1, secNum, 7);
      const secCell = detailSheet.getCell(`A${secNum}`);
      secCell.value = `取得割合 ${row.ratio}%${isOptimal ? ' ★最小' : ''}　（合計税額: ${formatCurrency(row.totalTax)}）`;
      secCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      secCell.fill = isOptimal ? FILLS.mainHeader : FILLS.subHeader;
      secCell.alignment = { vertical: 'middle', horizontal: 'left' };
      secCell.border = ALL_GREEN_BORDERS;
      detailSheet.getRow(secNum).height = 22;

      // 1次相続ヘッダー (col 1-3) / 2次相続ヘッダー (col 5-7)
      const subHeaderRow = detailSheet.addRow([]);
      const subNum = subHeaderRow.number;
      const secondLabel = `2次相続（遺産: 固有${formatCurrency(spouseOwnEstate)} + 取得${formatCurrency(row.spouseAcquisition)} = ${formatCurrency(row.secondEstate)}）`;
      const headerPairs: [number, string][] = [[1, '1次相続'], [5, secondLabel]];
      headerPairs.forEach(([startCol, label]) => {
        detailSheet.mergeCells(subNum, startCol, subNum, startCol + 2);
        const hCell = detailSheet.getCell(subNum, startCol);
        hCell.value = label;
        hCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        hCell.fill = startCol === 1 ? FILLS.subHeader : solidFill('FF166534');
        hCell.alignment = { vertical: 'middle', horizontal: 'center' };
        hCell.border = ALL_GREEN_BORDERS;
      });
      detailSheet.getRow(subNum).height = 20;

      // 列ヘッダー
      const colLabels = ['相続人', '取得額', '納付税額', '', '相続人', '取得額', '納付税額'];
      const colRow = detailSheet.addRow(colLabels);
      colRow.eachCell((cell: any, colNumber: number) => {
        if (colNumber === 4) return;
        cell.font = { bold: true, size: 10 };
        cell.fill = solidFill('FFF3F4F6');
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = ALL_THIN_BORDERS;
      });
      colRow.height = 18;

      // データ行
      const maxRows = Math.max(row.firstBreakdowns.length, row.secondBreakdowns.length);
      for (let i = 0; i < maxRows; i++) {
        const first = row.firstBreakdowns[i];
        const second = row.secondBreakdowns[i];
        const dRow = detailSheet.addRow([
          first?.label ?? '',
          first ? formatCurrency(first.acquisitionAmount) : '',
          first ? formatCurrency(first.finalTax) : '',
          '',
          second?.label ?? '',
          second ? formatCurrency(second.acquisitionAmount) : '',
          second ? formatCurrency(second.finalTax) : '',
        ]);
        dRow.eachCell((cell: any, colNumber: number) => {
          if (colNumber === 4) return;
          cell.font = { size: 10 };
          cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 || colNumber === 5 ? 'left' : 'right' };
          cell.border = ALL_THIN_BORDERS;
          if (isOptimal) cell.fill = FILLS.highlight;
        });
        dRow.height = 18;
      }

      // 合計行
      const totalRow = detailSheet.addRow([
        '合計', '', formatCurrency(row.firstTax),
        '',
        '合計', '', formatCurrency(row.secondTax),
      ]);
      totalRow.eachCell((cell: any, colNumber: number) => {
        if (colNumber === 4) return;
        cell.font = { bold: true, size: 10 };
        cell.fill = FILLS.totalRow;
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 || colNumber === 5 ? 'left' : 'right' };
        cell.border = ALL_THIN_BORDERS;
      });
      totalRow.height = 18;

      detailSheet.addRow([]);
    });

    // 内訳シート列幅
    detailSheet.columns = [
      { width: 14 }, { width: 18 }, { width: 18 },
      { width: 3 },
      { width: 14 }, { width: 18 }, { width: 18 },
    ];

    // --- ファイル生成 ---
    await saveWorkbook(workbook, `1次2次比較_${getScenarioName(composition)}_${formatCurrency(estateValue)}.xlsx`);
  }, [data, composition, estateValue, spouseOwnEstate]);

  const { isExporting, error, handleExport } = useExcelExport(exportFn);

  return (
    <ExcelExportButton
      onClick={handleExport}
      disabled={data.length === 0}
      isExporting={isExporting}
      error={error}
    />
  );
});

ComparisonExcelExport.displayName = 'ComparisonExcelExport';
