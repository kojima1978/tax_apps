// 案件の一覧・ヘッダに出す文字列。
//
// 「どの欄が会社名で、どの欄が課税時期か」を知っているのはフロントだけ。サーバは
// 様式を解釈しないので、一覧に出す名前はここで様式の欄から作って保存時に一緒に送る。

import { DEFAULT_ERA } from '@/lib/wareki';
import type { TableProps } from '@/types/form';

export type CaseSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

const pad2 = (value: number) => String(value).padStart(2, '0');

/** 課税時期（第1表の1・f14）を「令和8年3月15日」の形にする。欠けた欄は出さない。 */
export function taxPeriodLabel(getField: TableProps['getField']): string {
  const read = (field: string) => getField('table1_1', field).trim();
  const year = read('f14_y');
  if (year === '') return '';

  const month = read('f14_m');
  const day = read('f14_d');
  return [
    `${read('f14_g') || DEFAULT_ERA}${year}年`,
    month === '' ? '' : `${month}月`,
    month !== '' && day !== '' ? `${day}日` : '',
  ].join('');
}

/** 一覧の見出しに使う会社名と課税時期。 */
export function caseLabelsOf(getField: TableProps['getField']) {
  return {
    companyName: getField('table1_1', 'f12').trim(),
    taxPeriod: taxPeriodLabel(getField),
  };
}

/** 一覧の表示名。会社名を入れる前の案件も見分けられるようにIDで代替する。 */
export function caseDisplayName(item: { id: number; companyName: string }): string {
  const name = item.companyName.trim();
  return name === '' ? `（会社名未入力 #${item.id}）` : name;
}

/** 一覧の更新日時。 */
export function formatSavedAt(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

const hhmm = (date: Date) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

/**
 * ヘッダの保存表示。
 *
 * 案件を選んでいるかどうかで保存先の意味が変わる（選んでいなければこの端末のブラウザにしか
 * 残らず、毎日のバックアップにも入らない）ので、同じ「自動保存」でも文言を分ける。
 */
export function saveStatusLabel(
  linked: boolean,
  status: CaseSaveStatus,
  caseSavedAt: Date | null,
  localSavedAt: Date | null,
): string {
  if (!linked) {
    return localSavedAt === null
      ? '入力するとこの端末に自動保存されます'
      : `この端末のみに保存 ${hhmm(localSavedAt)}（案件未選択）`;
  }

  switch (status) {
    case 'pending':
      return '案件へ保存します…';
    case 'saving':
      return '案件へ保存中…';
    case 'error':
      return '案件へ保存できませんでした';
    default:
      return caseSavedAt === null ? '案件に保存済み' : `案件に保存済み ${hhmm(caseSavedAt)}`;
  }
}
