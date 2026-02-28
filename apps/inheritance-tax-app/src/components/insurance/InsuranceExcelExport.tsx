import React, { memo, useCallback } from 'react';
import type { InsuranceSimulationResult, InsuranceContract, HeirComposition } from '../../types';
import { formatCurrency, formatDelta, formatDeltaArrow, formatSavingArrow, getScenarioName, getHeirNetProceeds, getHeirBaseAcquisition } from '../../utils';
import { type CompRow, FILLS, ALL_THIN_BORDERS, ALL_GREEN_BORDERS, solidFill, setupExcelWorkbook, addSectionHeader, addLabelValueRow, addComparisonTable, addHeirScenarioSheet, saveWorkbook } from '../../utils/excelStyles';
import { useExcelExport } from '../../hooks/useExcelExport';
import { useStaffInfo } from '../../contexts/StaffContext';
import { ExcelExportButton } from '../ExcelExportButton';

interface InsuranceExcelExportProps {
  result: InsuranceSimulationResult;
  composition: HeirComposition;
  estateValue: number;
  existingContracts: InsuranceContract[];
  newContracts: InsuranceContract[];
}

export const InsuranceExcelExport: React.FC<InsuranceExcelExportProps> = memo(({
  result,
  composition,
  estateValue,
  existingContracts,
  newContracts,
}) => {
  const { staffName, staffPhone } = useStaffInfo();

  const exportFn = useCallback(async () => {
    const ExcelJS = await import('exceljs');

    const colCount = 4;
    const { workbook, worksheet } = setupExcelWorkbook({
      ExcelJS,
      sheetName: '保険金シミュレーション',
      title: '死亡保険金シミュレーション',
      colCount,
      pageSetup: { paperSize: 9, orientation: 'landscape' },
      staffInfo: { name: staffName, phone: staffPhone },
    });

    // --- 入力条件 ---
    addSectionHeader(worksheet, colCount, '入力条件');
    addLabelValueRow(worksheet, colCount, '遺産総額', formatCurrency(estateValue));
    addLabelValueRow(worksheet, colCount, '相続人構成', getScenarioName(composition));
    addLabelValueRow(worksheet, colCount, '非課税限度額', formatCurrency(result.current.nonTaxableLimit));
    worksheet.addRow([]);

    // --- シナリオ比較（Δ列付き） ---
    addSectionHeader(worksheet, colCount, 'シナリオ比較');

    const { current, proposed, taxSaving, netProceedsDiff, newPremiumTotal, baseEstate } = result;

    const compData: CompRow[] = [
      { label: '元の財産額', cur: baseEstate, prop: baseEstate },
      { label: '新規保険料', cur: 0, prop: newPremiumTotal, valuePrefix: 'ー' },
      { label: '受取保険金（全額）', cur: current.totalBenefit, prop: proposed.totalBenefit },
      { label: '非課税額', cur: current.nonTaxableAmount, prop: proposed.nonTaxableAmount },
      { label: '課税対象保険金', cur: current.taxableInsurance, prop: proposed.taxableInsurance },
      { label: '課税遺産額', cur: current.adjustedEstate, prop: proposed.adjustedEstate },
      { label: '相続税額', cur: current.taxResult.totalFinalTax, prop: proposed.taxResult.totalFinalTax },
      { label: '納税後財産額', cur: current.totalNetProceeds, prop: proposed.totalNetProceeds, highlight: true },
    ];

    addComparisonTable(worksheet, colCount, compData, [
      ['税金の増減', formatSavingArrow(taxSaving)],
      ['納税後財産額の増減', formatDeltaArrow(netProceedsDiff)],
    ], [22, 18, 18, 18]);

    // === Sheet 2: 保険契約一覧 ===
    const contractSheet = workbook.addWorksheet('保険契約一覧', {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });

    contractSheet.mergeCells(1, 1, 1, 5);
    const contractTitle = contractSheet.getCell('A1');
    contractTitle.value = '保険契約一覧';
    contractTitle.font = { size: 18, bold: true, color: { argb: 'FF16A34A' } };
    contractTitle.alignment = { vertical: 'middle', horizontal: 'center' };
    contractSheet.getRow(1).height = 30;
    contractSheet.addRow([]);

    const addContractSection = (title: string, contracts: InsuranceContract[], headerFill: any) => {
      const secRowNum = contractSheet.rowCount + 1;
      contractSheet.mergeCells(secRowNum, 1, secRowNum, 5);
      const secCell = contractSheet.getCell(`A${secRowNum}`);
      secCell.value = title;
      secCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      secCell.fill = headerFill;
      secCell.alignment = { vertical: 'middle', horizontal: 'left' };
      secCell.border = ALL_GREEN_BORDERS;
      contractSheet.getRow(secRowNum).height = 24;

      const hdr = contractSheet.addRow(['No.', '受取人', '支払保険料', '受取保険金額', '差額']);
      hdr.eachCell((cell: any) => {
        cell.font = { bold: true, size: 10 };
        cell.fill = solidFill('FFF3F4F6');
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = ALL_THIN_BORDERS;
      });

      if (contracts.length === 0) {
        const emptyRow = contractSheet.addRow(['', '契約なし', '', '', '']);
        emptyRow.eachCell((cell: any) => { cell.border = ALL_THIN_BORDERS; cell.font = { size: 10, color: { argb: 'FF999999' } }; });
      } else {
        let totalBenefit = 0;
        let totalPremium = 0;
        contracts.forEach((c, i) => {
          totalBenefit += c.benefit;
          totalPremium += c.premium;
          const row = contractSheet.addRow([i + 1, c.beneficiaryLabel, formatCurrency(c.premium), formatCurrency(c.benefit), formatCurrency(c.benefit - c.premium)]);
          row.eachCell((cell: any, col: number) => {
            cell.font = { size: 10 };
            cell.alignment = { vertical: 'middle', horizontal: col <= 2 ? (col === 1 ? 'center' : 'left') : 'right' };
            cell.border = ALL_THIN_BORDERS;
          });
        });
        const totalRow = contractSheet.addRow(['', '合計', formatCurrency(totalPremium), formatCurrency(totalBenefit), formatCurrency(totalBenefit - totalPremium)]);
        totalRow.eachCell((cell: any, col: number) => {
          cell.font = { bold: true, size: 10 };
          cell.fill = FILLS.totalRow;
          cell.alignment = { vertical: 'middle', horizontal: col <= 2 ? (col === 1 ? 'center' : 'left') : 'right' };
          cell.border = ALL_THIN_BORDERS;
        });
      }
      contractSheet.addRow([]);
    };

    addContractSection('既存保険契約', existingContracts, FILLS.subHeader);
    addContractSection('新規検討契約', newContracts, solidFill('FF3B82F6'));

    contractSheet.columns = [
      { width: 8 }, { width: 14 }, { width: 18 }, { width: 18 }, { width: 18 },
    ];

    // === Sheet 3: 相続人別内訳（納税後列付き） ===
    const heirCount = current.heirBreakdowns.length;
    const colHeaders = ['相続人', '遺産取得額', '保険料負担', '受取保険金', '納付税額', '納税後'];

    const buildScenario = (scenario: typeof current) => ({
      label: scenario.label,
      summaryText: `税額: ${formatCurrency(scenario.taxResult.totalFinalTax)} / 納税後: ${formatCurrency(scenario.totalNetProceeds)}`,
      columnHeaders: colHeaders,
      heirCount,
      getRowData: (i: number) => {
        const heir = scenario.heirBreakdowns[i];
        const taxEntry = scenario.taxResult.heirBreakdowns[i];
        return [
          heir.label,
          formatCurrency(getHeirBaseAcquisition(scenario, i)),
          heir.premiumPaid > 0 ? `ー${formatCurrency(heir.premiumPaid)}` : '—',
          formatCurrency(heir.totalBenefit),
          taxEntry ? formatCurrency(taxEntry.finalTax) : '—',
          formatCurrency(getHeirNetProceeds(scenario, i)),
        ];
      },
      getTotalRow: () => {
        const totalPremiumPaid = scenario.heirBreakdowns.reduce((s, b) => s + b.premiumPaid, 0);
        const totalBaseAcquisition = scenario.adjustedEstate + scenario.premiumDeduction - scenario.taxableInsurance;
        return [
          '合計',
          formatCurrency(totalBaseAcquisition),
          totalPremiumPaid > 0 ? `ー${formatCurrency(totalPremiumPaid)}` : '—',
          formatCurrency(scenario.totalBenefit),
          formatCurrency(scenario.taxResult.totalFinalTax),
          formatCurrency(scenario.totalNetProceeds),
        ];
      },
    });

    addHeirScenarioSheet(
      workbook,
      '相続人別 保険内訳・納税後比較',
      6,
      [buildScenario(current), buildScenario(proposed)],
      {
        heirCount,
        getLabel: i => current.heirBreakdowns[i]?.label || '',
        getCurrentNet: i => getHeirNetProceeds(current, i),
        getProposedNet: i => getHeirNetProceeds(proposed, i),
        totalCurrentNet: current.totalNetProceeds,
        totalProposedNet: proposed.totalNetProceeds,
        totalDiff: netProceedsDiff,
        formatCurrency,
        formatDelta,
      },
      [14, 16, 16, 16, 16, 16],
    );

    // --- 保存 ---
    await saveWorkbook(workbook, `保険金シミュレーション_${getScenarioName(composition)}_${formatCurrency(estateValue)}.xlsx`);
  }, [result, composition, estateValue, existingContracts, newContracts, staffName, staffPhone]);

  const { isExporting, error, handleExport } = useExcelExport(exportFn);

  return (
    <ExcelExportButton
      onClick={handleExport}
      isExporting={isExporting}
      error={error}
    />
  );
});

InsuranceExcelExport.displayName = 'InsuranceExcelExport';
