// 既存の取引との重複判定（Django 版 analyzer/handlers/wizard.py の mark_duplicates ほか）。
//
// 口座・日付・払戻額・お預り額・摘要が同じ行を「同じ取引かもしれない」とみなす。
// DB に同じキーが N 件あれば、取り込む側の同じキーの行は先頭から N 件までを重複とし、
// 超えた分は新規として扱う（通帳に同じ日・同じ金額・同じ摘要の取引が2回あることは普通にある）。
// 残高まで一致すれば確信度 high、キーだけ一致なら low。
//
// 索引（ExistingIndex）は判定のたびに消費する。1回の取込で複数のファイル・口座を
// 続けて判定しても、DB の1件を2つの行が取り合わないようにするため。
//
// Django 版との違い（#6）: 口座番号は文字列で比べる。Django 版は CSV に口座番号の列が
// あると数値で読んでいたので、DB の文字列とキーが一致せず、プレビューでは重複が
// 1件も出なかった（取込時にだけ文字列で判定し直して黙ってスキップしていた）。

import { accountIdentity, pickCompatibleAccount, type AccountIdentityFields } from './accountIdentity.js';
import { pyRound } from './pyRound.js';

export type DedupFields = AccountIdentityFields & {
  date: string; // 'YYYY-MM-DD'
  amountOut: number;
  amountIn: number;
  description: string | null;
  balance: number | null;
};

export type DupConfidence = 'high' | 'low';

export type DuplicateMark = {
  isDuplicate: boolean;
  dupConfidence: DupConfidence | null;
};

export type ExistingIndex = {
  counts: Map<string, number>;
  // キー → 残高 → 件数（残高の無い取引は null）
  balances: Map<string, Map<number | null, number>>;
  // 既存の取引が付いている口座（同一性ごとに1件）。取り込む側の口座を
  // 「その行が実際に入る口座」へ読み替えるために持つ（下の markDuplicates）
  accounts: AccountIdentityFields[];
};

export function dedupKey(
  account: AccountIdentityFields,
  date: string,
  amountOut: number,
  amountIn: number,
  description: string | null,
): string {
  return JSON.stringify([
    accountIdentity(account),
    date,
    Math.trunc(amountOut),
    Math.trunc(amountIn),
    (description ?? '').trim(),
  ]);
}

export function buildExistingIndex(existing: Iterable<DedupFields>): ExistingIndex {
  const counts = new Map<string, number>();
  const balances = new Map<string, Map<number | null, number>>();
  const accounts = new Map<string, AccountIdentityFields>();
  for (const t of existing) {
    const key = dedupKey(t, t.date, t.amountOut, t.amountIn, t.description);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    let bal = balances.get(key);
    if (!bal) balances.set(key, (bal = new Map()));
    bal.set(t.balance, (bal.get(t.balance) ?? 0) + 1);
    const identity = accountIdentity(t);
    if (!accounts.has(identity)) {
      accounts.set(identity, { bankName: t.bankName, branchName: t.branchName, accountNumber: t.accountNumber });
    }
  }
  return { counts, balances, accounts: [...accounts.values()] };
}

// rows に重複の印を付けたものを返す。index は消費される。
// 口座は行ではなく account（ファイルから読めた口座・画面で選んだ口座）で決める ──
// 1ファイルは1口座に分けてから渡ってくるので、行ごとの欄を見ると
// 「支店名だけ空の行」が別の口座の取引として判定されてしまう。
//
// その account は、取込で既存の口座に引き継がれる（getOrCreateAccount の 'adopt'）前の姿なので、
// 突き合わせる前に引き継ぎ先へ読み替える ── ファイルに銀行名が無く番号だけ読めたとき、
// 既存の「架空銀行 本店 1234567」の取引と同じ口座として判定しないと、同じ行をもう一度
// 取り込んでも重複 0件と出る（取込では同じ口座に入る）。引き継ぎ先が決まらない口座は
// 新しい口座として作られるので、既存の取引と重なることはない。
export function markDuplicates<T extends Omit<DedupFields, keyof AccountIdentityFields>>(
  rows: T[],
  index: ExistingIndex,
  account: AccountIdentityFields,
): { rows: (T & DuplicateMark)[]; duplicateCount: number } {
  const target = pickCompatibleAccount(index.accounts, account) ?? account;
  const keys = rows.map((r) => dedupKey(target, r.date, r.amountOut, r.amountIn, r.description));
  const marks: DuplicateMark[] = rows.map(() => ({ isDuplicate: false, dupConfidence: null }));
  const remaining = (key: string) => index.counts.get(key) ?? 0;
  const take = (key: string) => index.counts.set(key, remaining(key) - 1);

  // 1巡目: 残高まで一致する行を先に確定させる。同じ日・同じ金額の行が並んでいても、
  // DB にあるのと「同じ行」の方を重複に選べる。
  rows.forEach((r, i) => {
    const key = keys[i]!;
    if (remaining(key) <= 0 || r.balance === null) return;
    const bal = index.balances.get(key);
    const n = bal?.get(r.balance) ?? 0;
    if (bal && n > 0) {
      marks[i] = { isDuplicate: true, dupConfidence: 'high' };
      take(key);
      bal.set(r.balance, n - 1);
    }
  });

  // 2巡目: 残りの件数分は、残高が無い・合わない重複（要確認）。
  rows.forEach((r, i) => {
    const key = keys[i]!;
    if (marks[i]!.isDuplicate || remaining(key) <= 0) return;
    marks[i] = { isDuplicate: true, dupConfidence: 'low' };
    take(key);
    consumeBalanceSlot(index.balances.get(key), r.balance);
  });

  return {
    rows: rows.map((r, i) => ({ ...r, ...marks[i]! })),
    duplicateCount: marks.filter((m) => m.isDuplicate).length,
  };
}

// low の重複にも DB 側の残高を1つ割り当てて、残りの件数と残高の件数をそろえておく。
function consumeBalanceSlot(bal: Map<number | null, number> | undefined, balance: number | null): void {
  if (!bal) return;
  const n = balance === null ? 0 : (bal.get(balance) ?? 0);
  if (n > 0) {
    bal.set(balance, n - 1);
    return;
  }
  for (const [candidate, count] of bal) {
    if (count > 0) {
      bal.set(candidate, count - 1);
      return;
    }
  }
}

export function maxDuplicateRun(rows: { isDuplicate: boolean }[]): number {
  let longest = 0;
  let current = 0;
  for (const r of rows) {
    current = r.isDuplicate ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  return longest;
}

// 取り込む前の注意。既存データと何行も続けて一致する、または多くの行が一致するなら
// 同じファイルをもう一度取り込もうとしている可能性が高い。
const DUPLICATE_RUN_THRESHOLD = 3;
const DUPLICATE_RATIO_THRESHOLD = 0.3;
const DUPLICATE_RATIO_MIN_COUNT = 3;

export type DuplicateWarning = {
  maxRun: number;
  ratio: number;
  duplicateCount: number;
  message: string;
};

export function buildDuplicateWarning(
  rows: { isDuplicate: boolean }[],
  duplicateCount: number,
  rowCount: number,
): DuplicateWarning | null {
  if (duplicateCount <= 0 || rowCount <= 0) return null;

  const run = maxDuplicateRun(rows);
  const ratio = duplicateCount / rowCount;
  const byRun = run >= DUPLICATE_RUN_THRESHOLD;
  const byRatio = duplicateCount >= DUPLICATE_RATIO_MIN_COUNT && ratio >= DUPLICATE_RATIO_THRESHOLD;
  if (!byRun && !byRatio) return null;

  const message = byRun
    ? `既存データと ${run} 行連続で一致しています。重複インポートの可能性が高いです。`
    : `${rowCount} 件中 ${duplicateCount} 件（${pyRound(ratio * 100)}%）が既存データと一致しています。`;
  return { maxRun: run, ratio: pyRound(ratio, 2), duplicateCount, message };
}
