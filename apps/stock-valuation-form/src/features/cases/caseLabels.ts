// 案件の一覧・ヘッダに出す文字列。
//
// 「どの欄が会社名で、どの欄が課税時期か」を知っているのはフロントだけ。サーバは
// 様式を解釈しないので、一覧に出す名前はここで様式の欄から作って保存時に一緒に送る。

import { DEFAULT_ERA } from '@/lib/wareki';
import type { TableProps } from '@/types/form';

export type CaseSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'conflict';

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

/** アプリ名。画面ごとに書き写すと直し忘れるので1箇所に置く。 */
export const APP_TITLE = '取引相場のない株式の評価明細書';

/**
 * 帳票画面のヘッダ中央の見出し。いま書き戻している案件の名前を出し、案件に入る前だけ
 * アプリ名に戻す。
 *
 * 「どの会社のどの年分に書いているか」は第5表を打っている間も見えている必要があるが、
 * そのために押せない案件チップを右側へ別立てしていたのはやめた（ボタンの形をしていて
 * 押せない）。アプリ名は用紙にもブラウザのタブにも出ているので、見出しの位置は案件名に譲る。
 *
 * 名前は保存済みの案件ではなく打っている様式の欄から作る。一覧を読み込む前は案件の中身が
 * 手元に無く、案件に入っているのに「未選択」と出てしまうため（前のチップがそうだった）。
 */
export function formHeaderTitle(
  currentId: number | null,
  getField: TableProps['getField'],
): string {
  if (currentId === null) return APP_TITLE;
  const { companyName, taxPeriod } = caseLabelsOf(getField);
  const name = caseDisplayName({ id: currentId, companyName });
  return taxPeriod === '' ? name : `${name}（${taxPeriod}）`;
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
 * 案件に紐づいているかどうかで保存先の意味が変わる（紐づいていなければこの端末のブラウザに
 * しか残らず、毎日のバックアップにも入らない）ので、同じ「自動保存」でも文言を分ける。
 * 案件は自動で作られるので、紐づいていない状態は作る前か、作れなかったときだけ。
 *
 * 紐づいている側は「案件へ」を付けない。どの案件に書いているかは見出し（formHeaderTitle）に
 * 出ているので、1行に同じことを2度書かない。付けるのは端末にしか残らない側だけで、
 * そこは短くすると危ないことが伝わらなくなる。
 */
export function saveStatusLabel(
  linked: boolean,
  status: CaseSaveStatus,
  caseSavedAt: Date | null,
  localSavedAt: Date | null,
): string {
  if (!linked) {
    // 作れなかったことは黙って隠さない（隠すと端末にしか無いまま気づけない）。
    if (status === 'error') return '案件を作れませんでした（この端末のみに保存）';
    return localSavedAt === null
      ? '入力すると自動で案件に保存されます'
      : `この端末のみに保存 ${hhmm(localSavedAt)}（案件未選択）`;
  }

  switch (status) {
    case 'pending':
      return '保存します…';
    case 'saving':
      return '保存中…';
    case 'error':
      return '保存できませんでした';
    // 上書きを止めた状態。直るまで自動保存も止まるので、止まっていることを必ず出す。
    case 'conflict':
      return '別の端末で更新されました（保存を止めています）';
    default:
      return caseSavedAt === null ? '保存済み' : `保存済み ${hhmm(caseSavedAt)}`;
  }
}
