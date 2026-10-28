// 口座の同一性 ──「どの行がどの口座のものか」をここだけで決める。
//
// 長らく口座番号1つを同一性の代わりに使っていたが、番号は銀行をまたげば普通に重なるし、
// 同じ銀行でも支店が違えば別の口座。そのため**別の銀行の口座が1件に合流**し、取引も
// 残高証明もまとめて1つの口座に付いていた。同一性は「銀行名・支店名・口座番号」の3つで決める。
//
// DB 側も同じ同一性を持っている（UNIQUE (case_id, bank_name, branch_name, account_number)）。
// 銀行名・支店名は NULL ではなく '' に寄せてある ── Postgres の UNIQUE は NULL を重複と
// 見ないので、nullable のままでは「銀行名の無い同じ番号の口座」を何件でも作れてしまう。
//
// 種別・名義は同一性に入れない（残高証明の取込は種別を書いていないことがあり、同じ口座の
// 通帳データと別物になってしまう）。空いている欄は引き継ぎで埋める。

export type AccountIdentityFields = {
  bankName?: string | null;
  branchName?: string | null;
  accountNumber?: string | null;
};

// 口座番号を読み取れなかった行の番号（Django 版から引き継ぎ）
export const UNKNOWN_ACCOUNT = 'unknown';

// 同一性に使う文字列。前後の空白の違いで別の口座にしない（DB 側も btrim 済み）
export const identityText = (value: string | null | undefined): string => (value ?? '').trim();

export const accountNumberOf = (f: AccountIdentityFields): string =>
  identityText(f.accountNumber) || UNKNOWN_ACCOUNT;

// 比較・索引のキー（JSON 配列にするのは、欄の区切りが値に混ざらないようにするため）
export const accountIdentity = (f: AccountIdentityFields): string =>
  JSON.stringify([identityText(f.bankName), identityText(f.branchName), accountNumberOf(f)]);

export const sameAccount = (a: AccountIdentityFields, b: AccountIdentityFields): boolean =>
  accountIdentity(a) === accountIdentity(b);

// 画面・資金移動先に出す名前。空の欄は出さない
export const accountLabel = (f: AccountIdentityFields): string =>
  [identityText(f.bankName), identityText(f.branchName), accountNumberOf(f)].filter(Boolean).join(' ');

// 片方が空なら「違う口座」とは言えない（番号だけで登録された口座に、銀行名が後から付く）
const fits = (a: string, b: string) => a === '' || b === '' || a === b;

// 取込・直接入力で引き継ぐ既存の口座を選ぶ。
//   - 同一性が一致するものがあればそれ
//   - 無ければ、同じ番号で銀行名・支店名のどちらも衝突しない候補が1件だけのときだけ引き継ぎ、
//     空いている欄を埋める。候補が複数あるならどれのことか決められないので、混ぜずに
//     新しい口座として作る（同一性が一致しないので UNIQUE にも触れない）
export function pickCompatibleAccount<T extends AccountIdentityFields>(
  candidates: readonly T[],
  f: AccountIdentityFields,
): T | null {
  const number = accountNumberOf(f);
  const sameNumber = candidates.filter((c) => accountNumberOf(c) === number);
  const exact = sameNumber.find((c) => sameAccount(c, f));
  if (exact) return exact;
  const bankName = identityText(f.bankName);
  const branchName = identityText(f.branchName);
  const compatible = sameNumber.filter(
    (c) => fits(identityText(c.bankName), bankName) && fits(identityText(c.branchName), branchName),
  );
  return compatible.length === 1 ? compatible[0]! : null;
}
