// 取込ウィザードで画面が持つ行と、その検査（日付・金額・残高の突き合わせ）。
// 規則はサーバと同じ関数を使う（server/input.ts・server/lib/balance.ts）。画面だけ別の規則で
// 赤くすると、画面では通ったのに取込で弾かれる／その逆が起きるため。
//
// Django 版との違い:
// - 金額は文字のまま持つ。Django 版は parseInt(...) || 0 で読んだので、残高を消すと 0 円になった
// - 残高の誤差は直すたびに数え直す（Django 版は「残高を再計算」ボタンを押すまで古いままだった）
// - 行は key で追う。Django 版は挿入した行の番号（10000〜）と配列の位置がずれ、
//   挿入より後の行を直すと別の行に書き込まれていた
// - 何も書いていない行（日付だけの行も。挿入した行は上の日付を写すので）は「未入力」として
//   見せて送らない。Django 版は日付だけの行を 0 円の取引として登録していた。
//   逆に日付だけ空で他が埋まっている行はエラーにする（Django 版は黙って捨てていた）

import { parseAmountValue, parseDateValue } from '../../../server/input';
import { chainBalance } from '../../../server/lib/balance';
import type { PreviewFile } from '../../../server/lib/wizard';

export type AccountFields = {
  bankName: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
};

export const EMPTY_ACCOUNT: AccountFields = { bankName: '', branchName: '', accountType: '', accountNumber: '' };

export type EditRow = {
  key: number;
  date: string;
  description: string;
  amountOut: string;
  amountIn: string;
  balance: string;
  // プレビューでの重複の判定。行を直したら消す（取込時にサーバがもう一度判定する）
  dup: 'high' | 'low' | null;
};

export type EditFile = {
  key: number;
  filename: string;
  isSplit: boolean;
  // 口座番号をファイルから読めたか
  detected: boolean;
  hasBalance: boolean;
  warning: string | null;
  account: AccountFields;
  rows: EditRow[];
};

export type CheckedRow = EditRow & {
  // 何も書いていない行。取り込まない
  blank: boolean;
  error: string | null;
  calcBalance: number | null;
  isBalanceError: boolean;
};

const MAX_DESCRIPTION = 255;

let nextKey = 1;
export const newKey = () => nextKey++;

// 出金・入金の 0 は空欄で見せる（通帳と同じ）。残高の 0 は 0 と書く
export const isBlankRow = (r: EditRow) => [r.description, r.amountOut, r.amountIn, r.balance].every((v) => v.trim() === '');

export const blankRow = (date = ''): EditRow => ({ key: newKey(), date, description: '', amountOut: '', amountIn: '', balance: '', dup: null });

const amountText = (n: number) => (n === 0 ? '' : String(n));

export function toEditFiles(previews: PreviewFile[]): EditFile[] {
  return previews.map((p) => ({
    key: newKey(),
    filename: p.filename,
    isSplit: p.isSplit === true,
    detected: p.detectedAccount.accountNumber !== '',
    hasBalance: p.hasBalance,
    warning: p.warning?.message ?? null,
    account: { ...p.detectedAccount },
    rows: p.rows.map((r) => ({
      key: newKey(),
      date: r.date,
      description: r.description ?? '',
      amountOut: amountText(r.amountOut),
      amountIn: amountText(r.amountIn),
      balance: r.balance === null ? '' : String(r.balance),
      dup: r.isDuplicate ? (r.dupConfidence ?? 'high') : null,
    })),
  }));
}

function rowError(r: EditRow): { error: string | null; amountOut: number; amountIn: number; balance: number | null } {
  const date = parseDateValue(r.date);
  const amountOut = parseAmountValue(r.amountOut.trim(), '出金額', 0);
  const amountIn = parseAmountValue(r.amountIn.trim(), '入金額', 0);
  const balance = parseAmountValue(r.balance.trim(), '残高', null);
  const error = !date.ok
    ? date.error
    : !date.value
      ? '日付を入力してください'
      : r.description.length > MAX_DESCRIPTION
        ? `摘要は${MAX_DESCRIPTION}文字以内にしてください`
        : !amountOut.ok
          ? amountOut.error
          : !amountIn.ok
            ? amountIn.error
            : !balance.ok
              ? balance.error
              : null;
  return {
    error,
    amountOut: amountOut.ok ? amountOut.value : 0,
    amountIn: amountIn.ok ? amountIn.value : 0,
    balance: balance.ok ? balance.value : null,
  };
}

// 画面の並び順のまま突き合わせる（行を動かしたら、その順で数え直す）。未入力の行は飛ばす
export function checkRows(rows: EditRow[], hasBalance: boolean): CheckedRow[] {
  const filled = rows.filter((r) => !isBlankRow(r));
  const parsed = filled.map(rowError);
  const chained = hasBalance ? chainBalance(parsed) : parsed.map((p) => ({ ...p, calcBalance: null, isBalanceError: false }));
  const byKey = new Map(filled.map((r, i) => [r.key, chained[i]!]));
  return rows.map((r) => {
    const c = byKey.get(r.key);
    return { ...r, blank: !c, error: c?.error ?? null, calcBalance: c?.calcBalance ?? null, isBalanceError: c?.isBalanceError ?? false };
  });
}

// 取込（POST /cases/:id/import/commit）に送る形。金額は文字のまま送り、サーバが同じ規則で読む
export const toCommitFile = (f: EditFile) => ({
  account: f.account,
  rows: f.rows.filter((r) => !isBlankRow(r)).map(({ date, description, amountOut, amountIn, balance }) => ({ date, description, amountOut, amountIn, balance })),
});
