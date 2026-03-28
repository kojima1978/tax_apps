// ─── カテゴリカラーテーマ（画面表示用） ───

export const CATEGORY_THEME = {
  normal: {
    header: 'bg-gradient-to-r from-emerald-50 to-emerald-50/50 dark:from-emerald-950/50 dark:to-emerald-950/20 hover:from-emerald-100 hover:to-emerald-50 dark:hover:from-emerald-900/50 dark:hover:to-emerald-950/30 border-l-4 border-emerald-500',
    overlay: 'bg-emerald-50 dark:bg-emerald-950 border-l-4 border-emerald-500',
    progress: 'bg-emerald-400',
    progressDone: 'bg-emerald-500',
    printHeader: 'bg-emerald-50 border-l-4 border-emerald-500',
  },
  special: {
    header: 'bg-gradient-to-r from-purple-50 to-purple-50/50 dark:from-purple-950/50 dark:to-purple-950/20 hover:from-purple-100 hover:to-purple-50 dark:hover:from-purple-900/50 dark:hover:to-purple-950/30 border-l-4 border-purple-500',
    overlay: 'bg-purple-50 dark:bg-purple-950 border-l-4 border-purple-500',
    progress: 'bg-purple-400',
    progressDone: 'bg-purple-500',
    printHeader: 'bg-purple-50 border-l-4 border-purple-500',
  },
} as const;

export type CategoryThemeKey = keyof typeof CATEGORY_THEME;

export const getCategoryTheme = (isSpecial: boolean) =>
  isSpecial ? CATEGORY_THEME.special : CATEGORY_THEME.normal;
