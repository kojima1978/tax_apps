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
    items: ['チェック状態', '追加したカテゴリ・書類', '個別名', '並び順'],
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
  excelExportSuccess: 'Excelファイルをダウンロードしました',
  excelExportError: 'Excelファイルの生成に失敗しました',
  jsonExportSuccess: 'JSONファイルをダウンロードしました',
  importSuccess: 'データを読み込みました',
  resetSuccess: 'リストを初期状態にリセットしました',
  documentAdded: '書類を追加しました',
  documentDeleted: '書類を削除しました',
  categoryDeleted: 'カテゴリを削除しました',
} as const;
