// 残高の突き合わせ（Django 版 analyzer/lib/importer.py の validate_balance）。
//
// 前の行の残高 + お預り額 − 払戻額 = この行の残高 になっているかを、日付順に1行ずつ見る。
// 同じ日の行はファイルの並び順のまま（安定ソート）。
// 合わない行は印を付け、次の行からはその行に書かれた残高を起点に計算し直す
// （1か所の誤りが後ろの行すべてに波及しないように）。
//
// Django 版との違い: 残高が空欄の行（#2）は突き合わせない。計算上の残高を
// 次の行へ引き継ぐだけにする。Django 版は空欄を 0 と読んでいたので、
// その行と次の行の2か所に不整合が出ていた。

export type BalanceInput = {
  date: string; // 'YYYY-MM-DD'
  amountOut: number;
  amountIn: number;
  balance: number | null;
};

export type BalanceChecked<T> = T & {
  calcBalance: number | null;
  isBalanceError: boolean;
};

// 残高の列が無いファイルは並べ替えずにそのまま返す（Django 版と同じ）。
export function validateBalance<T extends BalanceInput>(rows: T[], hasBalance: boolean): BalanceChecked<T>[] {
  if (!hasBalance) return rows.map((r) => ({ ...r, calcBalance: null, isBalanceError: false }));

  // Array.prototype.sort は安定ソート（ES2019〜）
  const sorted = [...rows].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let prev: number | null = null;
  return sorted.map((r) => {
    if (prev === null) {
      // 起点。書かれた残高をそのまま使う（空欄ならまだ起点が無い）。
      prev = r.balance;
      return { ...r, calcBalance: r.balance, isBalanceError: false };
    }
    const expected: number = prev + r.amountIn - r.amountOut;
    if (r.balance === null) {
      prev = expected;
      return { ...r, calcBalance: expected, isBalanceError: false };
    }
    const isBalanceError = expected !== r.balance;
    prev = isBalanceError ? r.balance : expected;
    return { ...r, calcBalance: expected, isBalanceError };
  });
}
