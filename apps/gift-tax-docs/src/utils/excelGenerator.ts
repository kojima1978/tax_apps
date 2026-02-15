import type XLSX from 'xlsx-js-style';
import { COMPANY_INFO, getFullAddress, getContactLine, type DocumentGroup } from '@/constants';

// 共通ボーダー定義
const thinBorder = { style: 'thin', color: { rgb: 'E5E7EB' } } as const;
const dashedBorder = { style: 'dashed', color: { rgb: 'F1F5F9' } } as const;

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
            top: thinBorder,
            bottom: thinBorder,
            right: thinBorder,
        },
    },
    // 項目セル
    documentCell: {
        font: { sz: 11, color: { rgb: '374151' } }, // text-slate-700
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: { bottom: dashedBorder },
    },
    // 中項目セル
    subItemCell: {
        font: { sz: 10, color: { rgb: '6B7280' } }, // text-slate-500
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        border: { bottom: dashedBorder },
    },
    // チェックボックスセル
    checkCell: {
        font: { sz: 14, color: { rgb: '059669' } },
        alignment: { horizontal: 'center', vertical: 'top' },
        border: { bottom: dashedBorder },
    },
    // 備考セル
    noteCell: {
        font: { sz: 10, italic: true, color: { rgb: '6B7280' } }, // text-slate-500
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
        fill: { fgColor: { rgb: 'F8FAFC' } }, // bg-slate-50
        border: { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder },
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

export async function generateGiftTaxExcel(
    title: string,
    results: DocumentGroup[],
    currentDate: string,
    hideSubmitted: boolean,
    staffName: string,
    staffPhone: string,
    customerName: string,
    deadline: string
) {
    const XLSX = (await import('xlsx-js-style')).default;
    const wb = XLSX.utils.book_new();
    type CellStyle = typeof excelStyles[keyof typeof excelStyles];
    type Row = Array<{ v: string; s?: CellStyle }>;
    const wsData: Row[] = [];
    const merges: XLSX.Range[] = [];

    // ヘルパー: 行を追加（A・B列結合付き）
    const pushMergedRow = (text: string, style: CellStyle) => {
        merges.push({ s: { r: wsData.length, c: 0 }, e: { r: wsData.length, c: 1 } });
        wsData.push([{ v: text, s: style }, { v: '', s: style }]);
    };

    // ヘルパー: 行を追加（結合なし）
    const pushRow = (...cells: Row) => { wsData.push(cells); };

    // ヘルパー: 空行
    const pushEmptyRow = () => { wsData.push([{ v: '', s: undefined }, { v: '', s: undefined }]); };

    // タイトル行
    pushMergedRow(title, excelStyles.title);

    // サブタイトル
    pushMergedRow(`発行日: ${currentDate}`, excelStyles.subTitle);
    pushMergedRow(COMPANY_INFO.name, excelStyles.subTitle);

    // 担当者・お客様名・期限
    if (staffName || customerName || deadline) {
        const parts = [];
        if (customerName) parts.push(`お客様名: ${customerName}`);
        if (deadline) parts.push(`資料収集期限: ${deadline}`);
        if (staffName) parts.push(`担当者: ${staffName}`);
        pushMergedRow(parts.join(' / '), excelStyles.subTitle);
    }

    pushMergedRow(
        hideSubmitted ? '【未提出のみ】' : '【全書類（取消線あり）】',
        excelStyles.badge,
    );
    pushEmptyRow();

    // 各カテゴリとデータ
    results.forEach((group) => {
        pushMergedRow(group.category, excelStyles.categoryHeader);

        // 書類リスト
        group.documents.forEach((doc) => {
            const docStyle = doc.checked
                ? { ...excelStyles.documentCell, font: { ...excelStyles.documentCell.font, strike: true, color: { rgb: '9CA3AF' } } }
                : excelStyles.documentCell;
            const checkMark = doc.checked ? '☑' : '☐';
            pushRow(
                { v: checkMark, s: excelStyles.checkCell },
                { v: doc.text, s: docStyle },
            );

            // 中項目
            doc.subItems.forEach((subItem) => {
                pushRow(
                    { v: '', s: excelStyles.subItemCell },
                    { v: `　└ ${subItem}`, s: excelStyles.subItemCell },
                );
            });
        });

        // 備考（ある場合）
        if (group.note) {
            pushMergedRow(`ℹ ${group.note}`, excelStyles.noteCell);
        }

        pushEmptyRow();
    });

    // 注意事項
    pushMergedRow('【ご留意事項】', excelStyles.cautionHeader);
    pushMergedRow('・電子申告を行う場合、原本資料はご返却いたします。', excelStyles.cautionTextRed);
    pushEmptyRow();

    // フッター
    pushMergedRow(
        `${getFullAddress()} / ${getContactLine()}`,
        excelStyles.footer,
    );

    // 担当者連絡先
    if (staffPhone) {
        pushMergedRow(
            `担当: ${staffName || '−'} / 携帯: ${staffPhone}`,
            excelStyles.footer,
        );
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 列幅設定: A列(チェックボックス用)は狭く、B列(内容用)は広く
    ws['!cols'] = [{ wch: 6 }, { wch: 90 }];

    ws['!rows'] = [{ hpt: 35 }]; // Title height
    ws['!merges'] = merges;

    XLSX.utils.book_append_sheet(wb, ws, '必要書類リスト');

    const fileName = `贈与税申告_必要書類_${currentDate.replace(/\//g, '')}.xlsx`;
    XLSX.writeFile(wb, fileName);
}
