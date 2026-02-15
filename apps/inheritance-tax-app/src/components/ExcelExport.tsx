import React, { memo, useCallback } from 'react';
import type { TaxCalculationResult, HeirComposition } from '../types';
import { formatCurrency, formatPercent, getScenarioName } from '../utils';
import { isHighlightRow } from '../constants';
import { FILLS, GREEN_BORDER, ALL_THIN_BORDERS, applyMainHeaderStyle, setupExcelWorkbook } from '../utils/excelStyles';
import { useExcelExport } from '../hooks/useExcelExport';
import { ExcelExportButton } from './ExcelExportButton';

interface ExcelExportProps {
  data: TaxCalculationResult[];
  composition: HeirComposition;
}

export const ExcelExport: React.FC<ExcelExportProps> = memo(({
  data,
  composition,
}) => {
  const hasSpouse = composition.hasSpouse;

  const exportFn = useCallback(async () => {
    const [ExcelJS, { saveAs }] = await Promise.all([
      import('exceljs'),
      import('file-saver'),
    ]);

    const { workbook, worksheet } = setupExcelWorkbook({
      ExcelJS,
      sheetName: '相続税早見表',
      title: '相続税早見表',
      colCount: 6,
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

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

      dataRow.eachCell((cell: any, colNumber: number) => {
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

    // ファイル名の生成
    const fileName = `相続税早見表_${getScenarioName(composition)}.xlsx`;

    // ファイルを生成してダウンロード
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, fileName);
  }, [data, hasSpouse, composition]);

  const { isExporting, error, handleExport } = useExcelExport(exportFn);

  return (
    <div className="no-print">
      <ExcelExportButton
        onClick={handleExport}
        disabled={data.length === 0}
        isExporting={isExporting}
        error={error}
      />
    </div>
  );
});

ExcelExport.displayName = 'ExcelExport';
