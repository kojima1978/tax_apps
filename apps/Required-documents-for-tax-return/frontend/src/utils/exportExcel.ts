import XLSX from 'xlsx-js-style';
import { CategoryGroup } from '@/types';
import { toReiwa } from '@/utils/date';
import { taxReturnData } from '@/data/taxReturnData';

// スタイル定義
const styles = {
  title: {
    font: { bold: true, sz: 18, color: { rgb: '065F46' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  category: {
    font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    fill: { fgColor: { rgb: '10B981' } },
    border: {
      top: { style: 'thin', color: { rgb: '059669' } },
      bottom: { style: 'thin', color: { rgb: '059669' } },
      left: { style: 'thin', color: { rgb: '059669' } },
      right: { style: 'thin', color: { rgb: '059669' } },
    },
  },
  documentChecked: {
    font: { sz: 11, color: { rgb: '9CA3AF' }, strike: true },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    fill: { fgColor: { rgb: 'F0FDF4' } },
    border: {
      bottom: { style: 'hair', color: { rgb: 'E5E7EB' } },
    },
  },
  documentUnchecked: {
    font: { sz: 11, color: { rgb: '374151' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    fill: { fgColor: { rgb: 'FFFFFF' } },
    border: {
      bottom: { style: 'hair', color: { rgb: 'E5E7EB' } },
    },
  },
  checkMark: {
    font: { bold: true, sz: 14, color: { rgb: '16A34A' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'F0FDF4' } },
  },
  checkEmpty: {
    font: { sz: 14, color: { rgb: 'D1D5DB' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: 'FFFFFF' } },
  },
  number: {
    font: { bold: true, sz: 10, color: { rgb: '10B981' } },
    alignment: { horizontal: 'right', vertical: 'center' },
  },
  subItemChecked: {
    font: { sz: 10, color: { rgb: '9CA3AF' }, strike: true },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    fill: { fgColor: { rgb: 'F0FDF4' } },
  },
  subItemUnchecked: {
    font: { sz: 10, color: { rgb: '6B7280' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    fill: { fgColor: { rgb: 'FAFAFA' } },
  },
  note: {
    font: { italic: true, sz: 8, color: { rgb: '6B7280' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  header: {
    font: { bold: true, sz: 10, color: { rgb: '6B7280' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
    },
  },
};

export function exportToExcel(documentGroups: CategoryGroup[], year: number, customerName: string = '', staffName: string = '', mobileNumber?: string): void {
  const data: { v: string | number; s?: object }[][] = [];
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = [];

  // タイトル行（年度なし、全列結合、背景色なし）
  data.push([
    { v: '確定申告 必要書類リスト', s: styles.title },
    { v: '', s: styles.title },
    { v: '', s: styles.title },
    { v: '', s: styles.title },
  ]);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }); // タイトル全列結合

  // お客様名・担当者名行
  // A2:B2を結合して「お客様名：」（左詰め、文字小さく）
  // C2に「〇〇〇〇様」
  // D2に「担当：〇〇〇」（右詰め、文字小さく）
  const infoLabelStyle = { font: { sz: 9, color: { rgb: '6B7280' } }, alignment: { horizontal: 'left', vertical: 'center' } }; // ラベルは左寄せ、文字小さく
  const customerNameStyle = { font: { bold: true, sz: 12, color: { rgb: '374151' } }, alignment: { horizontal: 'left', vertical: 'center' } };
  const staffStyle = { font: { sz: 9, color: { rgb: '6B7280' } }, alignment: { horizontal: 'right', vertical: 'bottom' } };

  data.push([
    { v: 'お客様名：', s: infoLabelStyle },
    { v: '', s: infoLabelStyle },
    { v: `${customerName || ''} 様`, s: customerNameStyle },
    { v: `担当：${staffName || ''}`, s: staffStyle },
  ]);
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }); // お客様名ラベル A2:B2結合

  // ヘッダー行（背景色なし）
  data.push([
    { v: '✓', s: styles.header },
    { v: 'No.', s: styles.header },
    { v: '書類名', s: styles.header },
    { v: '備考', s: styles.header },
  ]);

  let currentRow = 3; // 0: タイトル, 1: お客様名・担当者名, 2: ヘッダー

  // カテゴリごとにデータを追加
  documentGroups.forEach((group) => {
    // カテゴリ行（セル結合用に行番号を記録）
    data.push([
      { v: group.category, s: styles.category },
      { v: '', s: styles.category },
      { v: '', s: styles.category },
      { v: '', s: styles.category },
    ]);
    // カテゴリ行をA〜Dまで結合
    merges.push({ s: { r: currentRow, c: 0 }, e: { r: currentRow, c: 3 } });
    currentRow++;

    // 書類リスト
    group.documents.forEach((doc, docIndex) => {
      const isChecked = doc.checked;
      const docStyle = isChecked ? styles.documentChecked : styles.documentUnchecked;
      const checkStyle = isChecked ? styles.checkMark : styles.checkEmpty;

      data.push([
        { v: isChecked ? '✓' : '☐', s: checkStyle },
        { v: `${docIndex + 1}.`, s: { ...styles.number, fill: docStyle.fill } },
        { v: doc.text, s: docStyle },
        { v: '', s: docStyle },
      ]);
      currentRow++;

      // サブアイテム
      if (doc.subItems && doc.subItems.length > 0) {
        doc.subItems.forEach((subItem, subIndex) => {
          const subChecked = subItem.checked;
          const subStyle = subChecked ? styles.subItemChecked : styles.subItemUnchecked;
          const subCheckStyle = subChecked ? styles.checkMark : styles.checkEmpty;

          data.push([
            { v: subChecked ? '✓' : '☐', s: { ...subCheckStyle, font: { ...subCheckStyle.font, sz: 10 } } },
            { v: '', s: subStyle },
            { v: `${subIndex + 1}) ${subItem.text}`, s: subStyle },
            { v: '', s: subStyle },
          ]);
          currentRow++;
        });
      }
    });

    // 注記
    if (group.note) {
      data.push([
        { v: '', s: styles.note },
        { v: '', s: styles.note },
        { v: group.note, s: styles.note },
        { v: '', s: styles.note },
      ]);
      currentRow++;
    }
  });

  // 発行情報（会社名、住所、電話番号、発行日）- C列とD列を結合して表示
  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const footerStyle = { font: { sz: 9, color: { rgb: '6B7280' } }, alignment: { horizontal: 'right' } };

  // 空行
  data.push([
    { v: '', s: {} },
    { v: '', s: {} },
    { v: '', s: {} },
    { v: '', s: {} },
  ]);
  currentRow++;

  // 会社名（C列とD列を結合）
  data.push([
    { v: '', s: {} },
    { v: '', s: {} },
    { v: taxReturnData.contactInfo.office, s: footerStyle },
    { v: '', s: footerStyle },
  ]);
  merges.push({ s: { r: currentRow, c: 2 }, e: { r: currentRow, c: 3 } });
  currentRow++;

  // 住所（C列とD列を結合）
  data.push([
    { v: '', s: {} },
    { v: '', s: {} },
    { v: taxReturnData.contactInfo.address, s: footerStyle },
    { v: '', s: footerStyle },
  ]);
  merges.push({ s: { r: currentRow, c: 2 }, e: { r: currentRow, c: 3 } });
  currentRow++;

  // 電話番号（C列とD列を結合）
  data.push([
    { v: '', s: {} },
    { v: '', s: {} },
    { v: `TEL: ${taxReturnData.contactInfo.tel}`, s: footerStyle },
    { v: '', s: footerStyle },
  ]);
  merges.push({ s: { r: currentRow, c: 2 }, e: { r: currentRow, c: 3 } });
  currentRow++;

  // 携帯電話番号（ある場合のみ、C列とD列を結合）
  if (mobileNumber) {
    data.push([
      { v: '', s: {} },
      { v: '', s: {} },
      { v: `携帯: ${mobileNumber}`, s: footerStyle },
      { v: '', s: footerStyle },
    ]);
    merges.push({ s: { r: currentRow, c: 2 }, e: { r: currentRow, c: 3 } });
    currentRow++;
  }

  // 発行日（C列とD列を結合）
  const dateStyle = { font: { sz: 9, color: { rgb: '9CA3AF' } }, alignment: { horizontal: 'right' } };
  data.push([
    { v: '', s: {} },
    { v: '', s: {} },
    { v: `発行日: ${dateStr}`, s: dateStyle },
    { v: '', s: dateStyle },
  ]);
  merges.push({ s: { r: currentRow, c: 2 }, e: { r: currentRow, c: 3 } });

  // ワークシートを作成
  const ws = XLSX.utils.aoa_to_sheet(data);

  // 列幅を設定（A4横幅に収まるように調整、4列構成）
  ws['!cols'] = [
    { wch: 3 },   // チェック
    { wch: 4 },   // 番号
    { wch: 60 },  // 書類名
    { wch: 15 },  // 備考
  ];

  // 行の高さを設定
  ws['!rows'] = [
    { hpt: 30 },  // タイトル行
    { hpt: 20 },  // お客様名・担当者名行
    { hpt: 20 },  // ヘッダー行
  ];

  // セル結合を適用
  ws['!merges'] = merges;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '必要書類リスト');

  // 印刷設定（A4縦、列を1ページに収める）
  ws['!pageSetup'] = {
    paperSize: 9,           // A4
    orientation: 'portrait', // 縦向き
    fitToWidth: 1,          // 幅を1ページに収める
    fitToHeight: 0,         // 高さは自動
    scale: 100,             // スケール100%
    horizontalDpi: 300,
    verticalDpi: 300,
  };

  // 印刷範囲の余白設定
  ws['!margins'] = {
    left: 0.5,
    right: 0.5,
    top: 0.75,
    bottom: 0.75,
    header: 0.3,
    footer: 0.3,
  };

  // 印刷時のヘッダー行を繰り返し設定
  ws['!printHeader'] = { s: { r: 0 }, e: { r: 1 } };

  // ファイル名を生成
  const fileName = `確定申告_必要書類リスト_令和${toReiwa(year)}年分.xlsx`;

  // ダウンロード
  XLSX.writeFile(wb, fileName);
}
