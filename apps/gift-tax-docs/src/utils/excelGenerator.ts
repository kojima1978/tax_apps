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
    // カテゴリヘッダー（画面の緑色背景のヘッダーに対応）
    categoryHeader: {
        font: { bold: true, sz: 12, color: { rgb: '1F2937' } }, // text-slate-800
        fill: { fgColor: { rgb: 'ECFDF5' } }, // bg-emerald-50
        alignment: { horizontal: 'left', vertical: 'center' },
        border: {
            left: { style: 'thick', color: { rgb: '10B981' } }, // border-l-4 border-emerald-500
            top: { style: 'thin', color: { rgb: 'E5E7EB' } },
            bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
            right: { style: 'thin', color: { rgb: 'E5E7EB' } },
        },
    },
    // 項目セル
    documentCell: {
        font: { sz: 11, color: { rgb: '374151' } }, // text-slate-700
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: {
            bottom: { style: 'dashed', color: { rgb: 'F1F5F9' } }, // border-dashed border-slate-100
        },
    },
    // チェックボックスセル
    checkCell: {
        font: { sz: 14, color: { rgb: '059669' } },
        alignment: { horizontal: 'center', vertical: 'top' }, // 上揃えにして、複数行テキストでも位置が合うように
        border: {
            bottom: { style: 'dashed', color: { rgb: 'F1F5F9' } },
        },
    },
    // 備考セル
    noteCell: {
        font: { sz: 10, italic: true, color: { rgb: '6B7280' } }, // text-slate-500
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        fill: { fgColor: { rgb: 'F8FAFC' } }, // bg-slate-50
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

    // 2列構成 (A: Check, B: Content)
    // A列とB列を結合して使うことが多い

    // タイトル行
    wsData.push([{ v: title, s: excelStyles.title }, { v: '', s: excelStyles.title }]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 1 } });
    rowNum++;

    // サブタイトル
    wsData.push([{ v: `発行日: ${currentDate}`, s: excelStyles.subTitle }, { v: '', s: excelStyles.subTitle }]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 1 } });
    rowNum++;

    wsData.push([{ v: COMPANY_INFO.name, s: excelStyles.subTitle }, { v: '', s: excelStyles.subTitle }]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 1 } });
    rowNum++;

    wsData.push([
        {
            v: isFullListMode ? '【全リスト表示】' : '【お客様専用リスト】',
            s: excelStyles.badge,
        },
        { v: '', s: excelStyles.badge }
    ]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 1 } });
    rowNum++;

    wsData.push([{ v: '', s: undefined }, { v: '', s: undefined }]);
    rowNum++;

    // 各カテゴリとデータ
    results.forEach((group) => {
        // カテゴリヘッダー
        wsData.push([
            { v: group.category, s: excelStyles.categoryHeader },
            { v: '', s: excelStyles.categoryHeader } // Merge destination formatting
        ]);
        merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 1 } });
        rowNum++;

        // 書類リスト
        group.documents.forEach((doc) => {
            wsData.push([
                { v: '☐', s: excelStyles.checkCell },
                { v: doc, s: excelStyles.documentCell },
            ]);
            rowNum++;
        });

        // 備考（ある場合）
        if (group.note) {
            wsData.push([
                { v: `ℹ ${group.note}`, s: excelStyles.noteCell }, // Info icon approximate
                { v: '', s: excelStyles.noteCell }
            ]);
            merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 1 } });
            rowNum++;
        }

        // グループ間の間隔
        wsData.push([{ v: '', s: undefined }, { v: '', s: undefined }]);
        rowNum++;
    });

    // 注意事項
    wsData.push([{ v: '【ご留意事項】', s: excelStyles.cautionHeader }, { v: '', s: excelStyles.cautionHeader }]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 1 } });
    rowNum++;

    wsData.push([
        {
            v: '・電子申告を行う場合、原本資料はご返却いたします。',
            s: excelStyles.cautionTextRed,
        },
        { v: '', s: excelStyles.cautionTextRed }
    ]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 1 } });
    rowNum++;

    wsData.push([{ v: '', s: undefined }, { v: '', s: undefined }]);
    rowNum++;

    // フッター
    wsData.push([
        {
            v: `${COMPANY_INFO.fullAddress} / ${COMPANY_INFO.contactLine}`,
            s: excelStyles.footer,
        },
        { v: '', s: excelStyles.footer }
    ]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 1 } });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 列幅設定: A列(チェックボックス用)は狭く、B列(内容用)は広く
    ws['!cols'] = [{ wch: 6 }, { wch: 90 }];

    ws['!rows'] = [{ hpt: 35 }]; // Title height
    ws['!merges'] = merges;

    XLSX.utils.book_append_sheet(wb, ws, '必要書類リスト');

    const fileName = `贈与税申告_必要書類_${currentDate.replace(/\//g, '')}.xlsx`;
    XLSX.writeFile(wb, fileName);
}
