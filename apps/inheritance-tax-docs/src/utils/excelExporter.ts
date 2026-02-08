import XLSX from 'xlsx-js-style';
import type { CategoryData, DocumentItem, CustomDocumentItem } from '../constants/documents';
import { isCustomDocument, formatDate, formatDeadline } from './helpers';

export interface ExcelExportParams {
  results: { category: CategoryData; documents: (DocumentItem | CustomDocumentItem)[] }[];
  isFullListMode: boolean;
  clientName: string;
  deceasedName: string;
  deadline: string;
}

// Excel スタイル定義
const styles = {
  title: {
    font: { bold: true, sz: 18, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E3A8A' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  subTitle: {
    font: { sz: 11, color: { rgb: '374151' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  badge: {
    font: { bold: true, sz: 10, color: { rgb: '065F46' } },
    fill: { fgColor: { rgb: 'D1FAE5' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  clientInfo: {
    font: { sz: 11, color: { rgb: '1F2937' } },
    fill: { fgColor: { rgb: 'DBEAFE' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '93C5FD' } },
      bottom: { style: 'thin', color: { rgb: '93C5FD' } },
      left: { style: 'thin', color: { rgb: '93C5FD' } },
      right: { style: 'thin', color: { rgb: '93C5FD' } },
    },
  },
  noticeHeader: {
    font: { bold: true, sz: 11, color: { rgb: 'B45309' } },
    fill: { fgColor: { rgb: 'FEF3C7' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  noticeText: {
    font: { sz: 10, color: { rgb: '92400E' } },
    fill: { fgColor: { rgb: 'FFFBEB' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: false },
  },
  categoryHeader: {
    font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E40AF' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '1E3A8A' } },
      bottom: { style: 'thin', color: { rgb: '1E3A8A' } },
      left: { style: 'thin', color: { rgb: '1E3A8A' } },
      right: { style: 'thin', color: { rgb: '1E3A8A' } },
    },
  },
  tableHeader: {
    font: { bold: true, sz: 11, color: { rgb: '374151' } },
    fill: { fgColor: { rgb: 'F3F4F6' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'D1D5DB' } },
      bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
      left: { style: 'thin', color: { rgb: 'D1D5DB' } },
      right: { style: 'thin', color: { rgb: 'D1D5DB' } },
    },
  },
  documentCell: {
    font: { sz: 11, color: { rgb: '1F2937' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'E5E7EB' } },
      bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
      left: { style: 'thin', color: { rgb: 'E5E7EB' } },
      right: { style: 'thin', color: { rgb: 'E5E7EB' } },
    },
  },
  documentCellAlt: {
    font: { sz: 11, color: { rgb: '1F2937' } },
    fill: { fgColor: { rgb: 'F9FAFB' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'E5E7EB' } },
      bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
      left: { style: 'thin', color: { rgb: 'E5E7EB' } },
      right: { style: 'thin', color: { rgb: 'E5E7EB' } },
    },
  },
  checkCell: {
    font: { sz: 14, color: { rgb: '6B7280' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E5E7EB' } },
      bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
      left: { style: 'thin', color: { rgb: 'E5E7EB' } },
      right: { style: 'thin', color: { rgb: 'E5E7EB' } },
    },
  },
  delegateBadge: {
    font: { sz: 9, color: { rgb: 'B45309' } },
    fill: { fgColor: { rgb: 'FEF3C7' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'FCD34D' } },
      bottom: { style: 'thin', color: { rgb: 'FCD34D' } },
      left: { style: 'thin', color: { rgb: 'FCD34D' } },
      right: { style: 'thin', color: { rgb: 'FCD34D' } },
    },
  },
  footer: {
    font: { sz: 9, color: { rgb: '9CA3AF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
} as const;

/** A〜E列を結合する行を追加（注意事項、カテゴリヘッダー用） */
function pushMergedRow(wsData: object[][], mergeRows: number[], text: string, style: object): void {
  mergeRows.push(wsData.length);
  wsData.push([
    { v: text, s: style },
    { v: '', s: style },
    { v: '', s: style },
    { v: '', s: style },
    { v: '', s: style },
  ]);
}

/** 空行を追加 */
function pushEmptyRow(wsData: object[][]): void {
  wsData.push([]);
}

/**
 * Excel ファイルをエクスポート
 */
export function exportToExcel(params: ExcelExportParams): void {
  const { results, isFullListMode, clientName, deceasedName, deadline } = params;
  const exportDate = formatDate(new Date());

  const wb = XLSX.utils.book_new();
  const wsData: object[][] = [];

  // タイトル行
  wsData.push([{ v: '相続税申告 資料準備ガイド', s: styles.title }]);
  wsData.push([{ v: `発行日: ${exportDate}`, s: styles.subTitle }]);
  wsData.push([{ v: '税理士法人 マスエージェント', s: styles.subTitle }]);
  wsData.push([{ v: isFullListMode ? '【全リスト表示】' : '【お客様専用リスト】', s: styles.badge }]);
  pushEmptyRow(wsData);

  // 基本情報（入力されている場合）
  if (clientName || deceasedName || deadline) {
    const infoRow: object[] = [];
    if (clientName) infoRow.push({ v: `お客様名: ${clientName} 様`, s: styles.clientInfo });
    if (deceasedName) infoRow.push({ v: `被相続人: ${deceasedName} 様`, s: styles.clientInfo });
    if (deadline) {
      infoRow.push({ v: `資料収集期限: ${formatDeadline(deadline)}`, s: styles.clientInfo });
    }
    wsData.push(infoRow);
    pushEmptyRow(wsData);
  }

  // セル結合用の配列
  const noticeRows: number[] = [];
  const categoryHeaderRows: number[] = [];

  // 注意事項
  pushMergedRow(wsData, noticeRows, '【ご確認ください】', styles.noticeHeader);
  pushMergedRow(wsData, noticeRows, '・資料は原本、コピー、データなどどのような形でお送りいただいても結構です。原本はスキャンやコピーを行った後、すべてお返しいたします。', styles.noticeText);
  pushMergedRow(wsData, noticeRows, '・「取得代行可」の書類は弊社で取得代行を行うことが可能です。詳しくは担当者にお尋ねください。', styles.noticeText);
  pushMergedRow(wsData, noticeRows, '・身分関係書類は原則として相続開始日から10日を経過した日以後に取得したものが必要となります。', styles.noticeText);
  pushEmptyRow(wsData);

  // 各カテゴリのデータ
  results.forEach(({ category, documents }) => {
    pushMergedRow(wsData, categoryHeaderRows, `■ ${category.name}（${documents.length}件）`, styles.categoryHeader);

    // テーブルヘッダー
    wsData.push([
      { v: '✓', s: styles.tableHeader },
      { v: '必要書類名', s: styles.tableHeader },
      { v: '内容説明', s: styles.tableHeader },
      { v: '取得方法', s: styles.tableHeader },
      { v: '代行', s: styles.tableHeader },
    ]);

    // 書類リスト
    type DocWithCanDelegate = (DocumentItem | CustomDocumentItem) & { canDelegate?: boolean };
    documents.forEach((doc, idx) => {
      const cellStyle = idx % 2 === 0 ? styles.documentCell : styles.documentCellAlt;
      const isCustom = isCustomDocument(doc);
      const docWithDelegate = doc as DocWithCanDelegate;
      const canDelegate = docWithDelegate.canDelegate ?? false;
      const docName = isCustom ? `${doc.name} [追加]` : doc.name;
      wsData.push([
        { v: '☐', s: styles.checkCell },
        { v: docName, s: cellStyle },
        { v: doc.description, s: cellStyle },
        { v: doc.howToGet || '-', s: cellStyle },
        { v: canDelegate ? '可' : '', s: canDelegate ? styles.delegateBadge : cellStyle },
      ]);
    });

    pushEmptyRow(wsData);
  });

  // 留意事項
  pushMergedRow(wsData, noticeRows, '【ご留意事項】', styles.noticeHeader);
  pushMergedRow(wsData, noticeRows, '・原本が必要な書類と、コピーで対応可能な書類がございます。ご不明な点は担当者にご確認ください。', styles.noticeText);
  pushMergedRow(wsData, noticeRows, '・公的機関（市役所等）で取得する証明書は、原則として発行後3ヶ月以内のものをご用意ください。', styles.noticeText);

  if (isFullListMode) {
    pushMergedRow(wsData, noticeRows, '・本リストは「全項目表示」モードで出力されています。お客様の状況により不要な書類も含まれていますのでご注意ください。', styles.noticeText);
  }

  pushEmptyRow(wsData);

  // フッター
  wsData.push([{ v: '〒770-0002 徳島県徳島市春日２丁目３番３３号 / TEL 088-632-6228 / FAX 088-631-9870', s: styles.footer }]);

  // ワークシート作成
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // 列幅設定
  ws['!cols'] = [
    { wch: 6 },  // チェック
    { wch: 35 }, // 必要書類名
    { wch: 40 }, // 内容説明
    { wch: 35 }, // 取得方法
    { wch: 8 },  // 代行
  ];

  // 行の高さ設定
  ws['!rows'] = [
    { hpt: 35 }, // タイトル行
  ];

  // 印刷設定
  ws['!pageSetup'] = {
    fitToWidth: 1,
    fitToHeight: 0,
    orientation: 'portrait',
    paperSize: 9, // A4
  };

  // セル結合
  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // タイトル
    { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // 発行日
    { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }, // 事務所名
    { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } }, // モード表示
  ];

  categoryHeaderRows.forEach((rowNum) => {
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 4 } });
  });

  noticeRows.forEach((rowNum) => {
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 4 } });
  });

  ws['!merges'] = merges;

  XLSX.utils.book_append_sheet(wb, ws, '必要書類リスト');

  // ファイル名生成
  let fileName = '相続税申告_必要書類';
  if (clientName) fileName += `_${clientName}`;
  fileName += `_${exportDate.replace(/\//g, '')}.xlsx`;

  XLSX.writeFile(wb, fileName);
}
