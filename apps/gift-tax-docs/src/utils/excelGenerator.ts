import XLSX from 'xlsx-js-style';
import { COMPANY_INFO, type DocumentGroup } from '@/constants';

// Excelスタイル定義
const excelStyles = {
    title: {
        font: { bold: true, sz: 18, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '047857' } },
        alignment: { horizontal: 'center', vertical: 'center' },
    },
    subTitle: {
        font: { sz: 11, color: { rgb: '374151' } },
        alignment: { horizontal: 'left', vertical: 'center' },
    },
    badge: {
        font: { bold: true, sz: 10, color: { rgb: '1E40AF' } },
        fill: { fgColor: { rgb: 'DBEAFE' } },
        alignment: { horizontal: 'left', vertical: 'center' },
    },
    tableHeader: {
        font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '059669' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
            top: { style: 'thin', color: { rgb: '047857' } },
            bottom: { style: 'thin', color: { rgb: '047857' } },
            left: { style: 'thin', color: { rgb: '047857' } },
            right: { style: 'thin', color: { rgb: '047857' } },
        },
    },
    categoryCell: {
        font: { bold: true, sz: 11, color: { rgb: '065F46' } },
        fill: { fgColor: { rgb: 'D1FAE5' } },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: {
            top: { style: 'thin', color: { rgb: 'A7F3D0' } },
            bottom: { style: 'thin', color: { rgb: 'A7F3D0' } },
            left: { style: 'medium', color: { rgb: '059669' } },
            right: { style: 'thin', color: { rgb: 'A7F3D0' } },
        },
    },
    documentCell: {
        font: { sz: 11, color: { rgb: '374151' } },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: {
            top: { style: 'thin', color: { rgb: 'E5E7EB' } },
            bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
            left: { style: 'thin', color: { rgb: 'E5E7EB' } },
            right: { style: 'thin', color: { rgb: 'E5E7EB' } },
        },
    },
    checkCell: {
        font: { sz: 14, color: { rgb: '059669' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
            top: { style: 'thin', color: { rgb: 'E5E7EB' } },
            bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
            left: { style: 'thin', color: { rgb: 'E5E7EB' } },
            right: { style: 'thin', color: { rgb: 'E5E7EB' } },
        },
    },
    noteCell: {
        font: { sz: 10, italic: true, color: { rgb: '6B7280' } },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: {
            top: { style: 'thin', color: { rgb: 'E5E7EB' } },
            bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
            left: { style: 'thin', color: { rgb: 'E5E7EB' } },
            right: { style: 'thin', color: { rgb: 'E5E7EB' } },
        },
    },
    cautionHeader: {
        font: { bold: true, sz: 11, color: { rgb: 'B45309' } },
        fill: { fgColor: { rgb: 'FEF3C7' } },
        alignment: { horizontal: 'left', vertical: 'center' },
    },
    cautionTextRed: {
        font: { sz: 10, color: { rgb: 'FF0000' } },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    },
    footer: {
        font: { sz: 9, color: { rgb: '9CA3AF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
    },
};

export function generateGiftTaxExcel(
    title: string,
    results: DocumentGroup[],
    currentDate: string,
    isFullListMode: boolean
) {
    const wb = XLSX.utils.book_new();
    const wsData: Array<
        Array<{ v: string; s?: typeof excelStyles[keyof typeof excelStyles] }>
    > = [];
    const merges: XLSX.Range[] = [];
    let rowNum = 0;

    // タイトル行
    wsData.push([{ v: title, s: excelStyles.title }]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 3 } });
    rowNum++;

    // サブタイトル
    wsData.push([{ v: `発行日: ${currentDate}`, s: excelStyles.subTitle }]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 3 } });
    rowNum++;

    wsData.push([{ v: COMPANY_INFO.name, s: excelStyles.subTitle }]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 3 } });
    rowNum++;

    wsData.push([
        {
            v: isFullListMode ? '【全リスト表示】' : '【お客様専用リスト】',
            s: excelStyles.badge,
        },
    ]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 3 } });
    rowNum++;

    wsData.push([{ v: '', s: undefined }]);
    rowNum++;

    // テーブルヘッダー
    wsData.push([
        { v: 'カテゴリ', s: excelStyles.tableHeader },
        { v: '必要書類', s: excelStyles.tableHeader },
        { v: '✓', s: excelStyles.tableHeader },
        { v: '備考', s: excelStyles.tableHeader },
    ]);
    rowNum++;

    // 各カテゴリのデータ
    results.forEach((group) => {
        group.documents.forEach((doc, idx) => {
            wsData.push([
                {
                    v: idx === 0 ? group.category : '',
                    s: idx === 0 ? excelStyles.categoryCell : excelStyles.documentCell,
                },
                { v: doc, s: excelStyles.documentCell },
                { v: '☐', s: excelStyles.checkCell },
                {
                    v: idx === 0 && group.note ? group.note : '',
                    s: excelStyles.noteCell,
                },
            ]);
            rowNum++;
        });
    });

    wsData.push([{ v: '', s: undefined }]);
    rowNum++;

    // 注意事項
    wsData.push([{ v: '【ご留意事項】', s: excelStyles.cautionHeader }]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 3 } });
    rowNum++;

    wsData.push([
        {
            v: '・電子申告を行う場合、原本資料はご返却いたします。',
            s: excelStyles.cautionTextRed,
        },
    ]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 3 } });
    rowNum++;

    wsData.push([{ v: '', s: undefined }]);
    rowNum++;

    // フッター
    wsData.push([
        {
            v: `${COMPANY_INFO.fullAddress} / ${COMPANY_INFO.contactLine}`,
            s: excelStyles.footer,
        },
    ]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 3 } });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [{ wch: 32 }, { wch: 55 }, { wch: 6 }, { wch: 45 }];

    ws['!rows'] = [{ hpt: 35 }];
    ws['!merges'] = merges;

    XLSX.utils.book_append_sheet(wb, ws, '必要書類リスト');

    const fileName = `贈与税申告_必要書類_${currentDate.replace(/\//g, '')}.xlsx`;
    XLSX.writeFile(wb, fileName);
}
