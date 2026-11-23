import { BookOpenCheck, Building2, CircleHelp, ClipboardList, Contact, FileText, Settings, Stamp, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * アプリ内の画面と、登録先への入口の一覧。サイドバー（広い画面）とヘッダーのメニュー（狭い画面）が
 * 同じ一覧を読む ── 片方にだけ足して入口が食い違わないように。
 */

export type AppPageLink = {
  to: string;
  /** メニューでの名前 */
  label: string;
  /** サイドバー（幅 56px）での名前 */
  shortLabel: string;
  icon: LucideIcon;
  /** `/` のように、下の階層では光らせない入口 */
  end?: boolean;
};

export const APP_PAGES: AppPageLink[] = [
  { to: '/', label: '書類リスト', shortLabel: '書類', icon: ClipboardList, end: true },
  { to: '/acquisition-guides', label: '相続税申告の取得案内', shortLabel: '取得案内', icon: BookOpenCheck },
  { to: '/resources', label: '参考資料', shortLabel: '資料', icon: FileText },
  { to: '/power-of-attorney', label: '委任状', shortLabel: '委任状', icon: Stamp },
  { to: '/masters', label: 'マスタ管理', shortLabel: 'マスタ', icon: Settings },
  { to: '/help', label: '使い方', shortLabel: '使い方', icon: CircleHelp },
];

export type RegisterLink = {
  /** ゲートウェイからの絶対パス（社員台帳は別アプリなので Router の外） */
  href: string;
  label: string;
  /** 何を登録する場所か（ツールチップ） */
  title: string;
  icon: LucideIcon;
};

/** 会社を足したり直したりする場所（社員台帳の会社一覧）。 */
export const COMPANY_DIRECTORY_URL = '/staff-directory/companies';

/**
 * 登録先。どれも新しいタブで開く ── 委任状の入力は保存しないので、同じタブで移ると打ちかけの内容が消える。
 * 従業員と会社は社員台帳（全アプリ共通）、お客様はこのアプリの委任状のDB（被相続人・委任者）。
 */
export const REGISTER_LINKS: RegisterLink[] = [
  { href: '/staff-directory/', label: '従業員登録', title: '従業員の登録（社員台帳・新しいタブ）', icon: Users },
  { href: '/inheritance-tax-docs/power-of-attorney/principals', label: 'お客様登録', title: 'お客様（被相続人・委任者）の登録（新しいタブ）', icon: Contact },
  { href: COMPANY_DIRECTORY_URL, label: '会社登録', title: '会社の登録（社員台帳・新しいタブ）', icon: Building2 },
];
