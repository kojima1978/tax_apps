import React, { memo, useCallback } from 'react';
import type { CashGiftSimulationResult, GiftRecipient, HeirComposition } from '../../types';
import { formatCurrency, formatDelta, formatDeltaArrow, formatSavingArrow, getScenarioName, getGiftHeirNetProceeds } from '../../utils';
import { type CompRow, FILLS, ALL_THIN_BORDERS, solidFill, setupExcelWorkbook, addSectionHeader, addLabelValueRow, addComparisonTable, addHeirScenarioSheet, saveWorkbook } from '../../utils/excelStyles';
import { useExcelExport } from '../../hooks/useExcelExport';
import { useStaffInfo } from '../../contexts/StaffContext';
import { ExcelExportButton } from '../ExcelExportButton';

interface CashGiftExcelExportProps {
  result: CashGiftSimulationResult;
  composition: HeirComposition;
  estateValue: number;
  recipients: GiftRecipient[];
}

export const CashGiftExcelExport: React.FC<CashGiftExcelExportProps> = memo(({
  result,
  composition,
  estateValue,
  recipients,
}) => {
  const { staffName, staffPhone } = useStaffInfo();

  const exportFn = useCallback(async () => {
    const ExcelJS = await import('exceljs');

    const colCount = 4;
    const { workbook, worksheet } = setupExcelWorkbook({
      ExcelJS,
      sheetName: '贈与シミュレーション',
      title: '現金贈与シミュレーション',
      colCount,
      pageSetup: { paperSize: 9, orientation: 'landscape' },
      staffInfo: { name: staffName, phone: staffPhone },
    });

    // --- 入力条件 ---
    addSectionHeader(worksheet, colCount, '入力条件');
    addLabelValueRow(worksheet, colCount, '遺産総額', formatCurrency(estateValue));
    addLabelValueRow(worksheet, colCount, '相続人構成', getScenarioName(composition));
    worksheet.addRow([]);

    // --- シナリオ比較 ---
    addSectionHeader(worksheet, colCount, 'シナリオ比較');

    const { current, proposed, inheritanceTaxSaving, netProceedsDiff, totalGifts, totalGiftTax, baseEstate } = result;

    const compData: CompRow[] = [
      { label: '元の財産額', cur: baseEstate, prop: baseEstate },
      { label: '生前贈与', cur: 0, prop: totalGifts, valuePrefix: 'ー' },
      { label: '課税遺産額', cur: current.estateValue, prop: proposed.estateValue },
      { label: '相続税額', cur: current.taxResult.totalFinalTax, prop: proposed.taxResult.totalFinalTax, sectionEnd: true },
      { label: '生前贈与', cur: 0, prop: totalGifts },
      { label: '贈与税 合計', cur: 0, prop: totalGiftTax, sectionEnd: true },
      { label: '税負担合計（相続税＋贈与税）', cur: current.taxResult.totalFinalTax, prop: proposed.taxResult.totalFinalTax + totalGiftTax },
      { label: '税引後財産額', cur: current.totalNetProceeds, prop: proposed.totalNetProceeds, highlight: true },
    ];

    addComparisonTable(worksheet, colCount, compData, [
      ['相続税の節減', formatSavingArrow(inheritanceTaxSaving)],
      ['財産額の増減', formatDeltaArrow(netProceedsDiff)],
    ], [28, 18, 18, 18]);

    // === Sheet 2: 贈与詳細 ===
    const detailSheet = workbook.addWorksheet('贈与詳細', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    detailSheet.mergeCells(1, 1, 1, 7);
    const detailTitle = detailSheet.getCell('A1');
    detailTitle.value = '受取人別 贈与詳細';
    detailTitle.font = { size: 18, bold: true, color: { argb: 'FF16A34A' } };
    detailTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    detailSheet.getRow(1).height = 30;
    detailSheet.addRow([]);

    const detailHeaders = ['No.', '受取人', '贈与年数', '年間贈与額', '総贈与額', '年間贈与税', '総贈与税'];
    const detailHdr = detailSheet.addRow(detailHeaders);
    detailHdr.eachCell((cell: any) => {
      cell.font = { bold: true, size: 10 };
      cell.fill = solidFill('FFF3F4F6');
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = ALL_THIN_BORDERS;
    });

    let detailTotalGift = 0;
    let detailTotalTax = 0;
    result.recipientResults.forEach((r, i) => {
      detailTotalGift += r.totalGift;
      detailTotalTax += r.totalGiftTax;
      const row = detailSheet.addRow([
        i + 1, r.heirLabel, `${r.years}年`, formatCurrency(r.annualAmount),
        formatCurrency(r.totalGift),
        r.giftTaxPerYear > 0 ? formatCurrency(r.giftTaxPerYear) : '非課税',
        r.totalGiftTax > 0 ? formatCurrency(r.totalGiftTax) : '—',
      ]);
      row.eachCell((cell: any, col: number) => {
        cell.font = { size: 10 };
        cell.alignment = { vertical: 'middle', horizontal: col <= 2 ? (col === 1 ? 'center' : 'left') : (col === 3 ? 'center' : 'right') };
        cell.border = ALL_THIN_BORDERS;
      });
    });

    const detailTotalRow = detailSheet.addRow(['', '合計', '', '', formatCurrency(detailTotalGift), '', detailTotalTax > 0 ? formatCurrency(detailTotalTax) : '—']);
    detailTotalRow.eachCell((cell: any, col: number) => {
      cell.font = { bold: true, size: 10 };
      cell.fill = FILLS.totalRow;
      cell.alignment = { vertical: 'middle', horizontal: col <= 2 ? (col === 1 ? 'center' : 'left') : 'right' };
      cell.border = ALL_THIN_BORDERS;
    });

    detailSheet.columns = [
      { width: 8 }, { width: 12 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 },
    ];

    // === Sheet 3: 相続人別内訳 ===
    const emptyResults: typeof result.recipientResults = [];
    const heirCount = current.taxResult.heirBreakdowns.length;
    const colHeaders = ['相続人', '遺産取得額', '贈与受取額', '贈与税負担', '納付相続税', '税引後'];

    const buildScenario = (scenario: typeof current, rr: typeof result.recipientResults) => ({
      label: scenario.label,
      summaryText: `税額: ${formatCurrency(scenario.taxResult.totalFinalTax)} / 税引後: ${formatCurrency(scenario.totalNetProceeds)}`,
      columnHeaders: colHeaders,
      heirCount,
      getRowData: (i: number) => {
        const taxEntry = scenario.taxResult.heirBreakdowns[i];
        const matching = rr.filter(r => r.heirLabel === taxEntry.label);
        const giftTotal = matching.reduce((s, r) => s + r.totalGift, 0);
        const giftTaxTotal = matching.reduce((s, r) => s + r.totalGiftTax, 0);
        return [
          taxEntry.label,
          formatCurrency(taxEntry.acquisitionAmount),
          giftTotal > 0 ? formatCurrency(giftTotal) : '—',
          giftTaxTotal > 0 ? formatCurrency(giftTaxTotal) : '—',
          formatCurrency(taxEntry.finalTax),
          formatCurrency(getGiftHeirNetProceeds(scenario, i, rr)),
        ];
      },
      getTotalRow: () => {
        const totalGift = rr.reduce((s, r) => s + r.totalGift, 0);
        const totalGiftTax = rr.reduce((s, r) => s + r.totalGiftTax, 0);
        return [
          '合計',
          formatCurrency(scenario.estateValue),
          totalGift > 0 ? formatCurrency(totalGift) : '—',
          totalGiftTax > 0 ? formatCurrency(totalGiftTax) : '—',
          formatCurrency(scenario.taxResult.totalFinalTax),
          formatCurrency(scenario.totalNetProceeds),
        ];
      },
    });

    addHeirScenarioSheet(
      workbook,
      '相続人別 内訳・税引後比較',
      6,
      [buildScenario(current, []), buildScenario(proposed, result.recipientResults)],
      {
        heirCount,
        getLabel: i => current.taxResult.heirBreakdowns[i]?.label || '',
        getCurrentNet: i => getGiftHeirNetProceeds(current, i, emptyResults),
        getProposedNet: i => getGiftHeirNetProceeds(proposed, i, result.recipientResults),
        totalCurrentNet: current.totalNetProceeds,
        totalProposedNet: proposed.totalNetProceeds,
        totalDiff: netProceedsDiff,
        formatCurrency,
        formatDelta,
      },
      [14, 16, 16, 16, 16, 16],
    );

    // --- 保存 ---
    await saveWorkbook(workbook, `贈与シミュレーション_${getScenarioName(composition)}_${formatCurrency(estateValue)}.xlsx`);
  }, [result, composition, estateValue, recipients, staffName, staffPhone]);

  const { isExporting, error, handleExport } = useExcelExport(exportFn);

  return (
    <ExcelExportButton
      onClick={handleExport}
      isExporting={isExporting}
      error={error}
    />
  );
});

CashGiftExcelExport.displayName = 'CashGiftExcelExport';
