import React, { memo, useCallback } from 'react';
import type { CashGiftSimulationResult, GiftRecipient, HeirComposition } from '../../types';
import { formatCurrency, formatDelta, formatDeltaArrow, formatSavingArrow, getScenarioName, getGiftHeirNetProceeds } from '../../utils';
import { FILLS, ALL_THIN_BORDERS, ALL_GREEN_BORDERS, solidFill, setupExcelWorkbook, addSectionHeader, addLabelValueRow, applyTableHeaderStyle, addHighlightRows, addHeirComparisonSection, saveWorkbook } from '../../utils/excelStyles';
import { useExcelExport } from '../../hooks/useExcelExport';
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
  const exportFn = useCallback(async () => {
    const ExcelJS = await import('exceljs');

    const colCount = 4;
    const { workbook, worksheet } = setupExcelWorkbook({
      ExcelJS,
      sheetName: '贈与シミュレーション',
      title: '現金贈与シミュレーション',
      colCount,
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    // --- 入力条件 ---
    addSectionHeader(worksheet, colCount, '入力条件');
    addLabelValueRow(worksheet, colCount, '遺産総額', formatCurrency(estateValue));
    addLabelValueRow(worksheet, colCount, '相続人構成', getScenarioName(composition));
    worksheet.addRow([]);

    // --- シナリオ比較 ---
    addSectionHeader(worksheet, colCount, 'シナリオ比較');

    const compHeaders = ['項目', '現状', '提案', '差額（Δ）'];
    const compHeaderRow = worksheet.addRow(compHeaders);
    applyTableHeaderStyle(compHeaderRow);

    const { current, proposed, inheritanceTaxSaving, netProceedsDiff, totalGifts, totalGiftTax, baseEstate } = result;

    type CompRow = { label: string; cur: number; prop: number; highlight?: boolean; sectionEnd?: boolean; valuePrefix?: string };
    const compData: CompRow[] = [
      // 遺産縮小
      { label: '元の遺産額', cur: baseEstate, prop: baseEstate },
      { label: '生前贈与', cur: 0, prop: totalGifts, valuePrefix: 'ー' },
      // 税額計算
      { label: '課税遺産額', cur: current.estateValue, prop: proposed.estateValue },
      { label: '相続税額', cur: current.taxResult.totalFinalTax, prop: proposed.taxResult.totalFinalTax, sectionEnd: true },
      // 贈与加算
      { label: '生前贈与', cur: 0, prop: totalGifts },
      { label: '贈与税 合計', cur: 0, prop: totalGiftTax, sectionEnd: true },
      { label: '税負担合計（相続税＋贈与税）', cur: current.taxResult.totalFinalTax, prop: proposed.taxResult.totalFinalTax + totalGiftTax },
      { label: '手取り合計', cur: current.totalNetProceeds, prop: proposed.totalNetProceeds, highlight: true },
    ];

    const SECTION_BORDER = { style: 'medium' as const, color: { argb: 'FF9CA3AF' } };
    const fmtWithPrefix = (v: number, pfx?: string) => v > 0 && pfx ? `${pfx}${formatCurrency(v)}` : formatCurrency(v);
    compData.forEach(({ label, cur, prop, highlight, sectionEnd, valuePrefix }) => {
      const diff = prop - cur;
      const fmtDiff = diff !== 0 ? (valuePrefix ? `${valuePrefix}${formatCurrency(Math.abs(diff))}` : formatDelta(diff)) : '—';
      const row = worksheet.addRow([label, fmtWithPrefix(cur, valuePrefix), fmtWithPrefix(prop, valuePrefix), fmtDiff]);
      row.eachCell((cell: any, colNumber: number) => {
        cell.font = { size: 10, bold: colNumber === 1 || highlight || false };
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 ? 'left' : 'right' };
        cell.border = sectionEnd
          ? { ...ALL_THIN_BORDERS, bottom: SECTION_BORDER }
          : ALL_THIN_BORDERS;
        if (highlight) cell.fill = FILLS.highlight;
      });
    });

    // 結果ハイライト行
    addHighlightRows(worksheet, colCount, [
      ['相続税の節減', formatSavingArrow(inheritanceTaxSaving)],
      ['手取り増減', formatDeltaArrow(netProceedsDiff)],
    ]);

    worksheet.addRow([]);
    worksheet.columns = [
      { width: 28 }, { width: 18 }, { width: 18 }, { width: 18 },
    ];

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
    const heirSheet = workbook.addWorksheet('相続人別内訳', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    heirSheet.mergeCells(1, 1, 1, 6);
    const heirTitle = heirSheet.getCell('A1');
    heirTitle.value = '相続人別 内訳・手取り比較';
    heirTitle.font = { size: 18, bold: true, color: { argb: 'FF16A34A' } };
    heirTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    heirSheet.getRow(1).height = 30;
    heirSheet.addRow([]);

    const scenarios = [
      { scenario: current, recipientResults: [] as typeof result.recipientResults, headerFill: FILLS.mainHeader },
      { scenario: proposed, recipientResults: result.recipientResults, headerFill: FILLS.mainHeader },
    ];

    scenarios.forEach(({ scenario, recipientResults: rr, headerFill }) => {
      const secRowNum = heirSheet.rowCount + 1;
      heirSheet.mergeCells(secRowNum, 1, secRowNum, 6);
      const secCell = heirSheet.getCell(`A${secRowNum}`);
      secCell.value = `${scenario.label}（税額: ${formatCurrency(scenario.taxResult.totalFinalTax)} / 手取り: ${formatCurrency(scenario.totalNetProceeds)}）`;
      secCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      secCell.fill = headerFill;
      secCell.alignment = { vertical: 'middle', horizontal: 'left' };
      secCell.border = ALL_GREEN_BORDERS;
      heirSheet.getRow(secRowNum).height = 24;

      const colHeaders = ['相続人', '遺産取得額', '贈与受取額', '贈与税負担', '納付相続税', '手取り'];
      const hdr = heirSheet.addRow(colHeaders);
      hdr.eachCell((cell: any) => {
        cell.font = { bold: true, size: 10 };
        cell.fill = solidFill('FFF3F4F6');
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = ALL_THIN_BORDERS;
      });

      scenario.taxResult.heirBreakdowns.forEach((taxEntry, i) => {
        const matching = rr.filter(r => r.heirLabel === taxEntry.label);
        const giftTotal = matching.reduce((s, r) => s + r.totalGift, 0);
        const giftTaxTotal = matching.reduce((s, r) => s + r.totalGiftTax, 0);
        const netProceeds = getGiftHeirNetProceeds(scenario, i, rr);
        const row = heirSheet.addRow([
          taxEntry.label,
          formatCurrency(taxEntry.acquisitionAmount),
          giftTotal > 0 ? formatCurrency(giftTotal) : '—',
          giftTaxTotal > 0 ? formatCurrency(giftTaxTotal) : '—',
          formatCurrency(taxEntry.finalTax),
          formatCurrency(netProceeds),
        ]);
        row.eachCell((cell: any, col: number) => {
          cell.font = { size: 10 };
          cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'right' };
          cell.border = ALL_THIN_BORDERS;
        });
      });

      const totalGiftForScenario = rr.reduce((s, r) => s + r.totalGift, 0);
      const totalGiftTaxForScenario = rr.reduce((s, r) => s + r.totalGiftTax, 0);
      const totalRow = heirSheet.addRow([
        '合計',
        formatCurrency(scenario.estateValue),
        totalGiftForScenario > 0 ? formatCurrency(totalGiftForScenario) : '—',
        totalGiftTaxForScenario > 0 ? formatCurrency(totalGiftTaxForScenario) : '—',
        formatCurrency(scenario.taxResult.totalFinalTax),
        formatCurrency(scenario.totalNetProceeds),
      ]);
      totalRow.eachCell((cell: any, col: number) => {
        cell.font = { bold: true, size: 10 };
        cell.fill = FILLS.totalRow;
        cell.alignment = { vertical: 'middle', horizontal: col === 1 ? 'left' : 'right' };
        cell.border = ALL_THIN_BORDERS;
      });
      heirSheet.addRow([]);
    });

    // 手取り比較セクション
    const emptyResults: typeof result.recipientResults = [];
    const heirCount = current.taxResult.heirBreakdowns.length;
    addHeirComparisonSection(heirSheet, 6, {
      heirCount,
      getLabel: i => current.taxResult.heirBreakdowns[i]?.label || '',
      getCurrentNet: i => getGiftHeirNetProceeds(current, i, emptyResults),
      getProposedNet: i => getGiftHeirNetProceeds(proposed, i, result.recipientResults),
      totalCurrentNet: current.totalNetProceeds,
      totalProposedNet: proposed.totalNetProceeds,
      totalDiff: netProceedsDiff,
      formatCurrency,
      formatDelta,
    });

    heirSheet.columns = [
      { width: 14 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 },
    ];

    // --- 保存 ---
    await saveWorkbook(workbook, `贈与シミュレーション_${getScenarioName(composition)}_${formatCurrency(estateValue)}.xlsx`);
  }, [result, composition, estateValue, recipients]);

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
