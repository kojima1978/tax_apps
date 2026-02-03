import XLSX from 'xlsx-js-style';
import type { CategoryData, DocumentItem, CustomDocumentItem } from '../constants/documents';

// カスタム書類かどうかを判定
function isCustomDocument(doc: DocumentItem | CustomDocumentItem): doc is CustomDocumentItem {
  return 'isCustom' in doc && doc.isCustom === true;
}

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
    fill: { fgColor: { rgb: '1E3A8A' } }, // blue-800
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  subTitle: {
    font: { sz: 11, color: { rgb: '374151' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  badge: {
    font: { bold: true, sz: 10, color: { rgb: '065F46' } },
    fill: { fgColor: { rgb: 'D1FAE5' } }, // emerald-100
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  clientInfo: {
    font: { sz: 11, color: { rgb: '1F2937' } },
    fill: { fgColor: { rgb: 'DBEAFE' } }, // blue-100
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
    fill: { fgColor: { rgb: 'FEF3C7' } }, // amber-100
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  noticeText: {
    font: { sz: 10, color: { rgb: '92400E' } },
    fill: { fgColor: { rgb: 'FFFBEB' } }, // amber-50
    alignment: { horizontal: 'left', vertical: 'center', wrapText: false },
  },
  categoryHeader: {
    font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E40AF' } }, // blue-700
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
    fill: { fgColor: { rgb: 'F3F4F6' } }, // slate-100
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
    fill: { fgColor: { rgb: 'F9FAFB' } }, // slate-50
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

/**
 * 日付を日本語形式でフォーマット
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 期限日を日本語形式でフォーマット
 */
function formatDeadline(deadline: string): string {
  return new Date(deadline).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Excel ファイルをエクスポート
 */
export function exportToExcel(params: ExcelExportParams): void {
  const { results, isFullListMode, clientName, deceasedName, deadline } = params;
  const exportDate = formatDate(new Date());

  // ワークブック作成
  const wb = XLSX.utils.book_new();
  const wsData: object[][] = [];

  // タイトル行
  wsData.push([{ v: '相続税申告 資料準備ガイド', s: styles.title }]);

  // サブタイトル
  wsData.push([{ v: `発行日: ${exportDate}`, s: styles.subTitle }]);
  wsData.push([{ v: '税理士法人 マスエージェント', s: styles.subTitle }]);
  wsData.push([{ v: isFullListMode ? '【全リスト表示】' : '【お客様専用リスト】', s: styles.badge }]);

  // 空行
  wsData.push([]);

  // 基本情報（入力されている場合）
  if (clientName || deceasedName || deadline) {
    const infoRow: object[] = [];
    if (clientName) infoRow.push({ v: `お客様名: ${clientName} 様`, s: styles.clientInfo });
    if (deceasedName) infoRow.push({ v: `被相続人: ${deceasedName} 様`, s: styles.clientInfo });
    if (deadline) {
      infoRow.push({ v: `資料収集期限: ${formatDeadline(deadline)}`, s: styles.clientInfo });
    }
    wsData.push(infoRow);
    wsData.push([]);
  }

  // セル結合用の配列（注意事項・留意事項行を追跡）
  const noticeRows: number[] = [];

  // 注意事項
  wsData.push([
    { v: '【ご確認ください】', s: styles.noticeHeader },
    { v: '', s: styles.noticeHeader },
    { v: '', s: styles.noticeHeader },
    { v: '', s: styles.noticeHeader },
    { v: '', s: styles.noticeHeader },
  ]);
  noticeRows.push(wsData.length - 1);

  wsData.push([
    { v: '・資料は原本、コピー、データなどどのような形でお送りいただいても結構です。原本はスキャンやコピーを行った後、すべてお返しいたします。', s: styles.noticeText },
    { v: '', s: styles.noticeText },
    { v: '', s: styles.noticeText },
    { v: '', s: styles.noticeText },
    { v: '', s: styles.noticeText },
  ]);
  noticeRows.push(wsData.length - 1);

  wsData.push([
    { v: '・「取得代行可」の書類は弊社で取得代行を行うことが可能です。詳しくは担当者にお尋ねください。', s: styles.noticeText },
    { v: '', s: styles.noticeText },
    { v: '', s: styles.noticeText },
    { v: '', s: styles.noticeText },
    { v: '', s: styles.noticeText },
  ]);
  noticeRows.push(wsData.length - 1);

  wsData.push([
    { v: '・身分関係書類は原則として相続開始日から10日を経過した日以後に取得したものが必要となります。', s: styles.noticeText },
    { v: '', s: styles.noticeText },
    { v: '', s: styles.noticeText },
    { v: '', s: styles.noticeText },
    { v: '', s: styles.noticeText },
  ]);
  noticeRows.push(wsData.length - 1);

  // 空行
  wsData.push([]);

  // セル結合用の配列（カテゴリヘッダー行を追跡）
  const categoryHeaderRows: number[] = [];

  // 各カテゴリのデータ
  results.forEach(({ category, documents }) => {
    // カテゴリヘッダー行番号を記録
    categoryHeaderRows.push(wsData.length);

    // カテゴリヘッダー
    wsData.push([
      { v: `■ ${category.name}（${documents.length}件）`, s: styles.categoryHeader },
      { v: '', s: styles.categoryHeader },
      { v: '', s: styles.categoryHeader },
      { v: '', s: styles.categoryHeader },
      { v: '', s: styles.categoryHeader },
    ]);

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

    // カテゴリ間の空行
    wsData.push([]);
  });

  // 留意事項
  wsData.push([
    { v: '【ご留意事項】', s: styles.noticeHeader },
    { v: '', s: styles.noticeHeader },
    { v: '', s: styles.noticeHeader },
    { v: '', s: styles.noticeHeader },
    { v: '', s: styles.noticeHeader },
  ]);
  noticeRows.push(wsData.length - 1);

  wsData.push([
    { v: '・原本が必要な書類と、コピーで対応可能な書類がございます。ご不明な点は担当者にご確認ください。', s: styles.noticeText },
    { v: '', s: styles.noticeText },
    { v: '', s: styles.noticeText },
    { v: '', s: styles.noticeText },
    { v: '', s: styles.noticeText },
  ]);
  noticeRows.push(wsData.length - 1);

  wsData.push([
    { v: '・公的機関（市役所等）で取得する証明書は、原則として発行後3ヶ月以内のものをご用意ください。', s: styles.noticeText },
    { v: '', s: styles.noticeText },
    { v: '', s: styles.noticeText },
    { v: '', s: styles.noticeText },
    { v: '', s: styles.noticeText },
  ]);
  noticeRows.push(wsData.length - 1);

  if (isFullListMode) {
    wsData.push([
      { v: '・本リストは「全項目表示」モードで出力されています。お客様の状況により不要な書類も含まれていますのでご注意ください。', s: styles.noticeText },
      { v: '', s: styles.noticeText },
      { v: '', s: styles.noticeText },
      { v: '', s: styles.noticeText },
      { v: '', s: styles.noticeText },
    ]);
    noticeRows.push(wsData.length - 1);
  }

  // 空行
  wsData.push([]);

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

  // 印刷設定（すべての列を1ページに印刷）
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

  // カテゴリヘッダー行のセル結合（A列〜E列を結合）
  categoryHeaderRows.forEach((rowNum) => {
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 4 } });
  });

  // 注意事項・留意事項行のセル結合（A列〜E列を結合）
  noticeRows.forEach((rowNum) => {
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 4 } });
  });

  ws['!merges'] = merges;

  XLSX.utils.book_append_sheet(wb, ws, '必要書類リスト');

  // ファイル名生成
  let fileName = '相続税申告_必要書類';
  if (clientName) fileName += `_${clientName}`;
  fileName += `_${exportDate.replace(/\//g, '')}.xlsx`;

  // ダウンロード
  XLSX.writeFile(wb, fileName);
}
