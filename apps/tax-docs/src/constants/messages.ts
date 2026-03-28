// ─── ダイアログメッセージ ───

export const DIALOG_MESSAGES = {
  delete: {
    document: 'この書類を削除しますか？',
    category: (name: string) => `「${name}」を削除しますか？`,
    categorySubMessage: '含まれる書類もすべて削除されます。',
  },
  reset: {
    title: '編集内容をリセットしますか？',
    description: '以下の内容が初期状態に戻ります：',
    items: ['チェック状態', '追加したカテゴリ・書類', '中項目', '並び順'],
  },
  import: {
    title: 'データを取り込みますか？',
    description: '以下のデータが読み込まれます：',
    overwriteWarning: '※現在の編集内容は上書きされます',
  },
  importError: {
    title: '読み込みに失敗しました',
    description: 'JSONファイルの形式を確認してください。',
  },
} as const;

// ─── トーストメッセージ ───

export const TOAST_MESSAGES = {
  excelExportSuccess: 'Excelファイルを出力しました',
  excelExportError: 'Excel出力に失敗しました',
  jsonExportSuccess: 'JSONファイルを出力しました',
  resetSuccess: '初期状態にリセットしました',
  importSuccess: 'データを取り込みました',
} as const;
