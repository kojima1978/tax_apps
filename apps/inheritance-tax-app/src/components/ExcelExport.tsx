import React from 'react';
import { Download } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { TaxCalculationResult, HeirComposition } from '../types';

interface ExcelExportProps {
  data: TaxCalculationResult[];
  composition: HeirComposition;
  hasSpouse: boolean;
}

export const ExcelExport: React.FC<ExcelExportProps> = ({
  data,
  composition,
  hasSpouse,
}) => {
  const formatCurrency = (value: number): string => {
    const oku = Math.floor(value / 10000);
    const man = value % 10000;

    if (oku > 0 && man > 0) {
      return `${oku}億${man.toLocaleString()}万円`;
    } else if (oku > 0) {
      return `${oku}億円`;
    } else {
      return `${man.toLocaleString()}万円`;
    }
  };

  const getScenarioName = (): string => {
    const parts: string[] = [];

    if (composition.hasSpouse) {
      parts.push('配偶者あり');
    }

    // 選択された順位に基づいて相続人数を取得
    if (composition.selectedRank === 'rank1') {
      let rank1Count = 0;
      composition.rank1Children.forEach(child => {
        if (child.isDeceased && child.representatives) {
          rank1Count += child.representatives.length;
        } else if (!child.isDeceased) {
          rank1Count += 1;
        }
      });
      if (rank1Count > 0) {
        parts.push(`子${rank1Count}人`);
      }
    } else if (composition.selectedRank === 'rank2') {
      if (composition.rank2Ascendants.length > 0) {
        parts.push(`直系尊属${composition.rank2Ascendants.length}人`);
      }
    } else if (composition.selectedRank === 'rank3') {
      let rank3Count = 0;
      composition.rank3Siblings.forEach(sibling => {
        if (sibling.isDeceased && sibling.representatives) {
          rank3Count += sibling.representatives.length;
        } else if (!sibling.isDeceased) {
          rank3Count += 1;
        }
      });
      if (rank3Count > 0) {
        parts.push(`兄弟姉妹${rank3Count}人`);
      }
    }

    return parts.join('_') || '相続人なし';
  };

  const handleExport = async () => {
    if (data.length === 0) {
      alert('データがありません');
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = '税理士法人マスエージェント';
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
    companyCell.value = '税理士法人マスエージェント　〒770-0002 徳島県徳島市春日２丁目３−３３　TEL: 088-632-6228';
    companyCell.font = { size: 10, color: { argb: 'FF666666' } };
    companyCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 20;

    // 空行
    worksheet.addRow([]);

    // メインヘッダー（1次相続・2次相続）
    if (hasSpouse) {
      worksheet.mergeCells('A4:A5');
      worksheet.getCell('A4').value = '相続財産';

      worksheet.mergeCells('B4:D4');
      worksheet.getCell('B4').value = '1次相続（配偶者あり）';

      worksheet.mergeCells('E4:F4');
      worksheet.getCell('E4').value = '2次相続（配偶者なし）';

      // メインヘッダーのスタイル
      ['A4', 'B4', 'E4'].forEach(cell => {
        const headerCell = worksheet.getCell(cell);
        headerCell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
        headerCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF16A34A' },
        };
        headerCell.alignment = { vertical: 'middle', horizontal: 'center' };
        headerCell.border = {
          top: { style: 'medium', color: { argb: 'FF16A34A' } },
          left: { style: 'medium', color: { argb: 'FF16A34A' } },
          bottom: { style: 'medium', color: { argb: 'FF16A34A' } },
          right: { style: 'medium', color: { argb: 'FF16A34A' } },
        };
      });

      // サブヘッダー
      const subHeaders = ['相続財産', '相続税額', '実効税率', '配偶者控除後', '相続税額', '実効税率'];
      const subHeaderRow = worksheet.getRow(5);
      subHeaders.forEach((header, index) => {
        const cell = subHeaderRow.getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF22C55E' },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'medium', color: { argb: 'FF16A34A' } },
          right: { style: 'thin' },
        };
      });
      worksheet.getRow(5).height = 25;
    } else {
      // 配偶者なしの場合
      const headers = ['相続財産', '相続税額', '実効税率'];
      const headerRow = worksheet.getRow(4);
      headers.forEach((header, index) => {
        const cell = headerRow.getCell(index + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF16A34A' },
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF16A34A' } },
          left: { style: 'medium', color: { argb: 'FF16A34A' } },
          bottom: { style: 'medium', color: { argb: 'FF16A34A' } },
          right: { style: 'medium', color: { argb: 'FF16A34A' } },
        };
      });
      worksheet.getRow(4).height = 25;
    }

    // データ行を追加
    data.forEach((row, index) => {
      const rowData = hasSpouse
        ? [
            formatCurrency(row.estateValue),
            formatCurrency(row.totalTax),
            `${row.effectiveTaxRate.toFixed(2)}%`,
            formatCurrency(row.taxAfterSpouseDeduction),
            formatCurrency(row.taxAfterSpouseDeduction),
            `${row.effectiveTaxRateAfterSpouse.toFixed(2)}%`,
          ]
        : [
            formatCurrency(row.estateValue),
            formatCurrency(row.totalTax),
            `${row.effectiveTaxRate.toFixed(2)}%`,
          ];

      const dataRow = worksheet.addRow(rowData);
      const isHighlight = row.estateValue % 10000 === 0;
      const isAlternate = index % 2 === 0;

      dataRow.eachCell((cell, colNumber) => {
        // フォント
        cell.font = {
          size: 10,
          bold: colNumber === 1,
        };

        // 配置
        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber === 1 ? 'left' : 'right',
        };

        // 背景色
        if (isHighlight) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFEF3C7' }, // 黄色（アンバー）
          };
        } else if (isAlternate) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0FDF4' }, // 薄い緑
          };
        }

        // 罫線
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
          right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        };
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
    worksheet.headerFooter.oddFooter = '&C税理士法人マスエージェント　TEL: 088-632-6228';

    // ファイル名の生成
    const fileName = `相続税早見表_${getScenarioName()}.xlsx`;

    // ファイルを生成してダウンロード
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, fileName);
  };

  return (
    <div className="no-print">
      <button
        onClick={handleExport}
        disabled={data.length === 0}
        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed shadow-md transition-colors"
      >
        <Download className="w-5 h-5" />
        Excelダウンロード
      </button>
    </div>
  );
};
