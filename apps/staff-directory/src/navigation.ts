import { BuildingIcon, DepartmentIcon, HelpIcon, LinkIcon, UsersIcon, type Icon } from './components/icons';

export type AppPage = {
  to: string;
  label: string;
  icon: Icon;
  /** 使い方の画面の「画面の構成」の表に載せる1行説明 */
  description: string;
};

/** サイドバー（広い画面）と上の帯（狭い画面）で同じ入口を使う。使い方の画面の表もここから作る */
export const APP_PAGES: AppPage[] = [
  { to: '/', label: '社員', icon: UsersIcon, description: '社員の一覧。追加・修正・退職の手続き、未入力の人の絞り込み' },
  { to: '/departments', label: '部署', icon: DepartmentIcon, description: '会社ごとの部署の追加・名前の修正・並べ替え・使用の切り替え' },
  { to: '/companies', label: '会社', icon: BuildingIcon, description: '会社（関連会社）の名称・所在地・代表電話・代表者。帳票に刷る情報' },
  { to: '/links', label: '連携', icon: LinkIcon, description: '台帳の変更が各アプリへ届いているか、担当件数を読めているかの確認' },
];

/** 使い方の画面。サイドバーの下段（控え・ポータルと同じ並び）に置き、画面の一覧には入れない */
export const HELP_PAGE: AppPage = {
  to: '/help',
  label: '使い方',
  icon: HelpIcon,
  description: 'この画面。印刷すると A4 縦の説明書になります',
};

/** ポータルは Vite の base（/staff-directory/）の外なので、通常のページ遷移で出る */
export const PORTAL_HREF = '/';

export const APP_TITLE = '社員台帳';

export const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500';
