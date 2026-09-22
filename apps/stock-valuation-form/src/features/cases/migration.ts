// 案件（会社ごとの保存）より前から手元にある入力の扱い。
//
// 案件を足す前の入力は、この端末のブラウザ（localStorage）にしか無い。黙って案件に
// するのも、案件に移ったつもりで端末に取り残すのも困るので、条件がそろったときに
// 一度だけ訊く。どちらを選んでも localStorage の入力には触らない（捨てる経路は作らない）。

import type { CaseSummary } from './api';

/** 一度訊いたという印。断った人に毎回出さないために置く。 */
export const MIGRATION_ASKED_KEY = 'stock-valuation-form-case-migration-asked';

export function migrationAsked(): boolean {
  try {
    return localStorage.getItem(MIGRATION_ASKED_KEY) !== null;
  } catch {
    // 読めない環境（プライベートウィンドウ等）では訊かない。そもそも入力も残らない
    return true;
  }
}

export function markMigrationAsked(): void {
  try {
    localStorage.setItem(MIGRATION_ASKED_KEY, new Date().toISOString());
  } catch {
    // 印が残せなくても動きは変えない（次回また訊くだけ）
  }
}

interface MigrationCondition {
  /** 案件の一覧。サーバへ問い合わせられなかったときは null。 */
  cases: CaseSummary[] | null;
  currentId: number | null;
  hasInput: boolean;
  asked: boolean;
}

/**
 * 案件へ移すか訊くべきか。
 *
 * 訊くのは取り残しが起こりうる唯一の形 ── 手元に入力があり、案件はまだ1件も無く、
 * どの案件にも紐づいていないとき ── だけに絞る。サーバへ届かなかったときに訊くと、
 * 実際には案件があるのに同じ会社をもう1件作らせてしまうので黙る。
 */
export function shouldOfferMigration({ cases, currentId, hasInput, asked }: MigrationCondition): boolean {
  if (asked || !hasInput || currentId !== null) return false;
  return cases !== null && cases.length === 0;
}
