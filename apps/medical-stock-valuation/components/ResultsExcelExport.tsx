'use client';

import { useCallback } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { FormData, CalculationResult } from '@/lib/types';
import { formatSen } from '@/lib/utils';
import { toWareki } from '@/lib/date-utils';
import { setupExcelWorkbook, applyHeaderStyle, FILLS, ALL_THIN_BORDERS, COMPANY_INFO } from '@/lib/excel-styles';
import { useExcelExport } from '@/hooks/useExcelExport';
import { BTN } from '@/lib/button-styles';

interface Props {
  formData: FormData;
  result: CalculationResult;
}

export default function ResultsExcelExport({ formData, result }: Props) {
  const exportFn = useCallback(async () => {
    const [ExcelJS, { saveAs }] = await Promise.all([
      import('exceljs').then(m => m.default),
      import('file-saver'),
    ]);

    // Type definition for Cell needed for strict mode
    type Cell = import('exceljs').Cell;

    const reiwa = formData.fiscalYear ? `${toWareki(formData.fiscalYear)}年度` : '';
    const colCount = 5;

    const { workbook, worksheet } = setupExcelWorkbook({
      ExcelJS,
      sheetName: '出資持分評価',
      title: '出資持分の評価額試算',
      colCount,
      pageSetup: { paperSize: 9, orientation: 'portrait' },
    });

    // 列幅設定
    worksheet.columns = [
      { width: 8 },   // A: №
      { width: 22 },  // B: 出資者名/項目
      { width: 18 },  // C: 出資金額/値
      { width: 18 },  // D: 持分評価額
      { width: 18 },  // E: 贈与税額
    ];

    // Row 2: 事務所情報（上段: 法人名 + 担当者）
    worksheet.getCell('A2').value = `${COMPANY_INFO.name}　担当: ${formData.personInCharge || ''}`;

    // Row 3: 事務所情報（下段: 住所 + TEL）— setupExcelWorkbook の空行を活用
    worksheet.mergeCells(3, 1, 3, colCount);
    const addrCell = worksheet.getCell('A3');
    addrCell.value = `${COMPANY_INFO.postalCode} ${COMPANY_INFO.address}　TEL: ${COMPANY_INFO.phone}`;
    addrCell.font = { size: 10, color: { argb: 'FF666666' } };
    addrCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(3).height = 20;

    // Row 4: 評価対象（会社名 + 年度）
    const evalRow = worksheet.addRow([`${formData.companyName || ''}　${reiwa}`]);
    worksheet.mergeCells(evalRow.number, 1, evalRow.number, colCount);
    evalRow.getCell(1).font = { size: 11, bold: true, color: { argb: 'FF111827' } };
    evalRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    evalRow.height = 22;

    // 空行
    worksheet.addRow([]);

    // --- セクション1: 基本情報 ---
    const addSectionHeader = (label: string) => {
      const row = worksheet.addRow([label]);
      worksheet.mergeCells(row.number, 1, row.number, colCount);
      const cell = row.getCell(1);
      cell.font = { bold: true, size: 11, color: { argb: 'FF1E40AF' } };
      cell.fill = FILLS.subHeader;
      cell.border = ALL_THIN_BORDERS;
      row.height = 22;
    };

    const addLabelValueRow = (label: string, value: string) => {
      const row = worksheet.addRow([label, '', value]);
      worksheet.mergeCells(row.number, 1, row.number, 2);
      worksheet.mergeCells(row.number, 3, row.number, colCount);
      row.getCell(1).font = { size: 10, color: { argb: 'FF374151' } };
      row.getCell(3).font = { size: 10 };
      row.getCell(3).alignment = { horizontal: 'left' };
      [1, 3].forEach(c => { row.getCell(c).border = ALL_THIN_BORDERS; });
    };

    addSectionHeader('基本情報');
    addLabelValueRow('会社名', formData.companyName || '');
    addLabelValueRow('年度', reiwa);
    addLabelValueRow('会社規模', result.companySize);
    addLabelValueRow('評価方式', result.evaluationMethod);
    worksheet.addRow([]);

    // --- セクション2: 出資持分評価額 ---
    addSectionHeader('出資持分評価額');
    addLabelValueRow('当初出資額', formatSen(result.totalCapital));
    addLabelValueRow('出資持分評価額', formatSen(result.totalEvaluationValue));
    addLabelValueRow('みなし贈与税額', formatSen(result.deemedGiftTax));
    worksheet.addRow([]);

    // --- セクション3: 各出資者の出資持分評価額 ---
    addSectionHeader('各出資者の出資持分評価額');

    // テーブルヘッダー
    const headerRow = worksheet.addRow(['№', '出資者名', '出資金額', '出資持分評価額', '贈与税額']);
    headerRow.eachCell((cell: Cell) => {
      applyHeaderStyle(cell);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    });

    // テーブルデータ
    result.investorResults.forEach((inv, i) => {
      const row = worksheet.addRow([
        i + 1,
        inv.name || '',
        formatSen(Math.round((inv.amount || 0) / 1000)),
        formatSen(inv.evaluationValue || 0),
        formatSen(inv.giftTax || 0),
      ]);
      row.getCell(1).alignment = { horizontal: 'center' };
      [3, 4, 5].forEach(c => { row.getCell(c).alignment = { horizontal: 'right' }; });
      row.eachCell((cell: Cell) => { cell.border = ALL_THIN_BORDERS; });
    });

    // 合計行
    const totalRow = worksheet.addRow([
      '合計',
      '',
      formatSen(Math.round(formData.investors.reduce((sum, inv) => sum + (inv.amount || 0), 0) / 1000)),
      formatSen(result.investorResults.reduce((sum, inv) => sum + (inv.evaluationValue || 0), 0)),
      formatSen(result.investorResults.reduce((sum, inv) => sum + (inv.giftTax || 0), 0)),
    ]);
    totalRow.getCell(1).alignment = { horizontal: 'center' };
    [3, 4, 5].forEach(c => { totalRow.getCell(c).alignment = { horizontal: 'right' }; });
    totalRow.eachCell((cell: Cell) => {
      cell.font = { bold: true, size: 10 };
      cell.fill = FILLS.totalRow;
      cell.border = ALL_THIN_BORDERS;
    });

    worksheet.addRow([]);

    // --- セクション4: 参考要素 ---
    addSectionHeader('参考要素');

    const refHeaderRow = worksheet.addRow(['', '項目', '', '', '対象法人']);
    worksheet.mergeCells(refHeaderRow.number, 1, refHeaderRow.number, 1);
    worksheet.mergeCells(refHeaderRow.number, 2, refHeaderRow.number, 4);
    refHeaderRow.eachCell((cell: Cell) => {
      applyHeaderStyle(cell);
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    });

    const addRefRow = (label: string, value: string) => {
      const row = worksheet.addRow(['', label, '', '', value]);
      worksheet.mergeCells(row.number, 1, row.number, 1);
      worksheet.mergeCells(row.number, 2, row.number, 4);
      row.getCell(5).alignment = { horizontal: 'right' };
      row.eachCell((cell: Cell) => { cell.border = ALL_THIN_BORDERS; });
    };

    addRefRow('会社規模', result.companySize);
    addRefRow('特定の評価会社の該当判定', result.specialCompanyType);
    addRefRow('出資金額総額', formatSen(result.totalCapital));
    addRefRow('総出資口数（1口50円と仮定）', `${result.totalShares.toLocaleString('ja-JP')}口`);
    addRefRow('出資持分の相続税評価額', formatSen(result.inheritanceTaxValue));
    addRefRow('みなし贈与税額', formatSen(result.deemedGiftTax));
    addRefRow('1口あたり 類似業種比準価額方式', `${result.perShareSimilarIndustryValue.toLocaleString('ja-JP')}円`);
    addRefRow('1口あたり 純資産価額方式', `${result.perShareNetAssetValue.toLocaleString('ja-JP')}円`);
    addRefRow('L値（併用割合）', result.lRatio.toFixed(2));
    addRefRow('評価方式', result.evaluationMethod);
    addRefRow('1口あたりの評価額', `${result.perShareValue.toLocaleString('ja-JP')}円`);

    // ファイル保存
    const buffer = await workbook.xlsx.writeBuffer();
    const company = formData.companyName || '不明';
    const filename = `出資持分評価_${company}_${reiwa}.xlsx`;
    saveAs(new Blob([buffer]), filename);
  }, [formData, result]);

  const { isExporting, handleExport } = useExcelExport(exportFn);

  return (
    <button onClick={handleExport} disabled={isExporting} className={BTN}>
      {isExporting ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
      {isExporting ? 'Excel出力中...' : 'Excelダウンロード'}
    </button>
  );
}
