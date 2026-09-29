// 案件を作る前に決める「会社名と課税時期」。
//
// 入れ先は様式の欄そのもの（第1表の1の f12／f14_*）で、案件の列には持たない ── 一覧に出る
// 会社名と課税時期は保存のたびに欄から作り直される（caseLabels.ts）ので、別に持つと直す場所が
// 2つになる。ここでやるのは「先に訊いて、様式の欄へ書く」だけ。
//
// 先に訊くのは、同じ会社が別の会社として一覧に並ぶのを入口で防ぐため。2年目以降は
// 「評価したことのある会社」から選べば会社名を打ち直さずに済む ── キーを持たない案件同士は
// 会社名で寄せるので、空白以外が1文字でも違うと塊が割れる（caseGroups.ts）。

import { DEFAULT_ERA, YEAR_OPTS } from '@/lib/wareki';
import type { FormData } from '@/types/form';
import { type GroupableCase, groupCasesByCompany } from './caseGroups';

/** ダイアログで選べる会社（＝すでに年分のある会社）。 */
export interface NewCaseCompany {
  /** 会社の印（caseGroups の groupKeyOf が作る）。 */
  key: string;
  companyName: string;
  /** 写す元＝その会社の一番新しい年分。 */
  latestId: number;
  latestTaxPeriod: string;
}

/**
 * ダイアログに並べる会社。ゴミ箱の年分と会社名未入力の塊は出さない
 * （ゴミ箱の内容を写すと、消したはずのものが新しい年分として戻ってくる）。
 */
export function companiesForNewCase(
  cases: readonly (GroupableCase & { archivedAt: string | null })[],
): readonly NewCaseCompany[] {
  return groupCasesByCompany(cases.filter((item) => item.archivedAt === null))
    .filter((group) => group.companyName.trim() !== '')
    .flatMap((group) => {
      // 塊の中は課税時期の新しい順（caseGroups）。先頭＝一番新しい年分を写す元にする。
      const latest = group.items[0];
      return latest === undefined
        ? []
        : [{
            key: group.key,
            companyName: group.companyName,
            latestId: latest.id,
            latestTaxPeriod: latest.taxPeriod,
          }];
    });
}

/** 課税時期の4欄（第1表の1の f14_*）。値は様式のプルダウンの選択肢そのもの。 */
export interface TaxPeriodInput {
  era: string;
  year: string;
  month: string;
  day: string;
}

export interface CaseProfile extends TaxPeriodInput {
  companyName: string;
}

export const emptyTaxPeriod = (): TaxPeriodInput => ({ era: DEFAULT_ERA, year: '', month: '', day: '' });

export const emptyCaseProfile = (): CaseProfile => ({ companyName: '', ...emptyTaxPeriod() });

/** 作成できる状態か。会社名と年が無いと一覧で見分けられない（課税時期のラベルが空になる）。 */
export const isCaseProfileReady = (profile: CaseProfile): boolean =>
  profile.companyName.trim() !== '' && profile.year.trim() !== '';

/** 会社名と課税時期を第1表の1の欄へ入れる。 */
export function applyCaseProfile(data: FormData, profile: CaseProfile): FormData {
  return {
    ...data,
    table1_1: {
      ...data.table1_1,
      f12: profile.companyName.trim(),
      f14_g: profile.era,
      f14_y: profile.year,
      f14_m: profile.month,
      f14_d: profile.day,
    },
  };
}

/**
 * 一覧が持っている課税時期のラベル（「令和8年3月15日」）を欄の値に戻す。
 *
 * 一覧には欄の値がそのまま来ない（サーバは様式を解釈せず、表示用の文字列だけを持つ）ので、
 * 前の年分から作り始めるにはここで読み戻す。月・日は欠けていることがある。
 */
export function parseTaxPeriod(label: string): TaxPeriodInput | null {
  const matched = /^(\D*)(\d+)年(?:(\d+)月(?:(\d+)日)?)?$/.exec(label.trim());
  if (matched === null) return null;
  return {
    era: matched[1] || DEFAULT_ERA,
    year: matched[2] ?? '',
    month: matched[3] ?? '',
    day: matched[4] ?? '',
  };
}

/**
 * 同じ会社の「次の年分」の初期値。年を1つ進め、月日はそのまま（rollover.ts と同じ規則）。
 *
 * 読めないラベル・選択肢に無い年になるときは空欄から始める ── プルダウンに無い値を入れると
 * 画面は先頭の選択肢を出すのに保存値は別、という食い違いになる。
 */
export function nextTaxPeriod(label: string): TaxPeriodInput {
  const parsed = parseTaxPeriod(label);
  if (parsed === null) return emptyTaxPeriod();
  const next = String(Number(parsed.year) + 1);
  return YEAR_OPTS.includes(next) ? { ...parsed, year: next } : emptyTaxPeriod();
}
