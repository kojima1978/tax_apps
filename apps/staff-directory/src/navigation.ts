import { BuildingIcon, DepartmentIcon, LinkIcon, UsersIcon, type Icon } from './components/icons';

/** サイドバー（広い画面）と上の帯（狭い画面）で同じ入口を使う */
export const APP_PAGES: { to: string; label: string; icon: Icon }[] = [
  { to: '/', label: '社員', icon: UsersIcon },
  { to: '/departments', label: '部署', icon: DepartmentIcon },
  { to: '/companies', label: '会社', icon: BuildingIcon },
  { to: '/links', label: '連携', icon: LinkIcon },
];

/** ポータルは Vite の base（/staff-directory/）の外なので、通常のページ遷移で出る */
export const PORTAL_HREF = '/';

export const APP_TITLE = '社員台帳';

export const FOCUS_RING = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500';
