// 台帳の写しを持つアプリの一覧。ここだけに持つ ──
// サーバ（保存のたびの知らせ・notify.ts）と画面（連携の画面・復元の前の確かめ・src/linkedApps.ts）の両方がここを読む。
// 画面は同じゲートウェイの下からパス（basePath + …）で、サーバはコンテナ間の URL（origin + basePath + …）で呼ぶ。
// 何も import しないこと（画面のビルドにもそのまま入る）

export type LinkedAppKey = 'itcm' | 'private-banking';

export type LinkedAppTarget = {
  key: LinkedAppKey;
  label: string;
  /** ゲートウェイの下のパス（Next の basePath） */
  basePath: string;
  /** コンテナ間で呼ぶときの既定の送り先（tax-apps-network 上のコンテナ名）。LINKED_APP_ORIGINS で差し替えられる */
  defaultOrigin: string;
  /** そのアプリの担当者の画面（未連携の人を直す場所） */
  pagePath: string;
  /** 担当者の一覧（台帳ID つき）。復元の前の確かめに使う */
  copiesPath: string;
  /** 写しの状況。GET は記録を読むだけ、POST は今すぐ写し直す（台帳からは `{ "trigger": "directory" }` を送る） */
  syncPath: string;
  /** 台帳に居ない担当者の直し方 */
  unlinkedFix: string;
};

export const LINKED_APP_TARGETS: LinkedAppTarget[] = [
  {
    key: 'itcm',
    label: '案件管理',
    basePath: '/itcm',
    defaultOrigin: 'http://itcm-frontend:3020',
    pagePath: '/settings/staff',
    copiesPath: '/api/assignees',
    syncPath: '/api/staff-directory',
    unlinkedFix: '社員台帳のコンテナで「npm run import:itcm -- --yes」を流すと台帳へ取り込まれ、結び付きます。',
  },
  {
    key: 'private-banking',
    label: '資産・負債管理（PB）',
    basePath: '/private-banking',
    defaultOrigin: 'http://private-banking-app:3025',
    pagePath: '/staff',
    copiesPath: '/api/staff',
    syncPath: '/api/staff-directory',
    unlinkedFix: '担当していた顧客を、資産・負債管理の画面で台帳の人へ付け替えてください。',
  },
];

// ---- 社員ごとの担当件数（社員一覧の「担当」列・退職者の担当・編集画面の内訳） ----
// 各アプリが GET <basePath>/api/staff-directory/workload で返す（形は src/shared/staff-workload）。
// 画面がゲートウェイの下から直接読む。読めないアプリは「—」で、一覧は止めない。
// 台帳のサーバも同じ口を5分ごとに読み、読めない状態が続いているかを記録する（server/linkHealth.ts）

export type WorkloadSourceKey = LinkedAppKey | 'stock-valuation-form' | 'bank-analyzer';

export type WorkloadSource = {
  key: WorkloadSourceKey;
  label: string;
  /** ゲートウェイの下のパス。件数の口とリンク（そのアプリの一覧をその人で絞る）はこの後ろに付く */
  basePath: string;
  /** 台帳のサーバが読むときのコンテナ間の送り先（tax-apps-network 上のコンテナ名） */
  defaultOrigin: string;
};

export const WORKLOAD_SOURCES: WorkloadSource[] = [
  ...LINKED_APP_TARGETS.map(({ key, label, basePath, defaultOrigin }) => ({ key, label, basePath, defaultOrigin })),
  { key: 'stock-valuation-form', label: '株式評価明細書', basePath: '/stock-valuation-form', defaultOrigin: 'http://stock-valuation-form:3014' },
  { key: 'bank-analyzer', label: '預貯金分析', basePath: '/bank-analyzer', defaultOrigin: 'http://bank-analyzer:3007' },
];

// ---- 連携の見張り（server/linkHealth.ts が5分ごとに読み、失敗の始まりと終わりを台帳の DB に残す） ----
// sync = 写しの状況（写しを持つアプリだけ）、workload = 担当件数の口（WORKLOAD_SOURCES 全部）

export type LinkCheckKind = 'sync' | 'workload';

export const LINK_CHECK_KIND_LABEL: Record<LinkCheckKind, string> = {
  sync: '担当者・部署の写し',
  workload: '担当件数の読み取り',
};

/** 失敗が続いているときに人へ見せる画面（デスクトップの警告にも載せる） */
export const LINKS_PAGE_URL = 'http://localhost/staff-directory/links';
