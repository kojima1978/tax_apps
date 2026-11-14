// 取込ウィザードの中身（Django 版 analyzer/handlers/wizard.py の _parse_single_file ほか）。
//
// プレビュー: ファイルを読む → 残高を突き合わせる → 口座ごとに分ける → 既存の取引と重複を判定する。
// 取込: 画面で決めた口座を行に当て、DB の最新の状態でもう一度重複を判定してから入れる。
//
// Django 版との違い（#7）: 「重複を除外」のチェックを外せば、重複も取り込む。
// Django 版は画面が送る skipDuplicates を読まず、サーバが読む duplicateAction は
// 誰も送っていなかったので、チェックの有無に関係なく常に除外していた。

import { accountIdentity } from './accountIdentity.js';
import { validateBalance, type BalanceChecked } from './balance.js';
import {
  buildDuplicateWarning,
  markDuplicates,
  maxDuplicateRun,
  type DuplicateMark,
  type DuplicateWarning,
  type ExistingIndex,
} from './dedup.js';
import { loadStatement, type SkippedRow, type StatementRow } from './import/loadStatement.js';

export type DetectedAccount = {
  bankName: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
};

export type PreviewRow = BalanceChecked<StatementRow> & DuplicateMark;

export type PreviewFile = {
  filename: string;
  // 1ファイルに口座が複数あって分けたときだけ（元のファイル名）
  originalFilename?: string;
  isSplit?: true;
  rowCount: number;
  duplicateCount: number;
  duplicateRun: number;
  warning: DuplicateWarning | null;
  detectedAccount: DetectedAccount;
  hasBalance: boolean;
  rows: PreviewRow[];
  // 依頼26。取引でないので読み飛ばした行（繰越など。分けたときはその口座の分）と、
  // 残高のつながりの出発点に使った残高（読み飛ばした行のうち、最初の取引より前で最後のもの）
  skippedRows: SkippedRow[];
  openingBalance: number | null;
};

// ファイル名から銀行名を推測する（大文字小文字は区別しない）。
const BANK_NAME_PATTERNS: [RegExp, string][] = [
  [/みずほ/i, 'みずほ銀行'],
  [/三井住友/i, '三井住友銀行'],
  [/三菱UFJ|MUFG/i, '三菱UFJ銀行'],
  [/りそな/i, 'りそな銀行'],
  [/ゆうちょ/i, 'ゆうちょ銀行'],
  [/楽天/i, '楽天銀行'],
  [/住信SBI|SBI/i, '住信SBIネット銀行'],
  [/PayPay/i, 'PayPay銀行'],
];

// ファイル名の7〜8桁の数字を口座番号とみなす。Python の \d と同じく全角などの数字も含む。
const ACCOUNT_NUMBER_IN_FILENAME = /\p{Nd}{7,8}/u;

// 1つのファイルを読んで、口座ごとのプレビューにする。index は消費される
// （同じ取込で後に読むファイルが、同じ既存取引を重複として取り合わないように）。
// 行の誤りではファイルを止めない（lenient。読めない値・壊れた行の疑いは行に載せて画面で直す）。
export function buildPreview(filename: string, bytes: Uint8Array, index: ExistingIndex): PreviewFile[] {
  const statement = loadStatement(bytes, { allowMultiple: true, lenient: true });
  const groups = groupRowsByAccount(statement.rows);

  if (groups.length <= 1) {
    const opening = openingOf(statement.skipped, statement.rows, null);
    const rows = validateBalance(statement.rows, statement.hasBalance, opening.balance);
    const detected = detectAccount(rows[0], filename);
    return [previewFile(filename, rows, detected, statement.hasBalance, index, statement.skipped, opening.balance)];
  }

  return groups.map((g) => {
    // 口座ごとに残高を突き合わせる（混ざったままだと口座をまたいで計算してしまう）
    const key = accountIdentity(g.account);
    const opening = openingOf(statement.skipped, g.rows, key);
    const groupRows = validateBalance(g.rows, statement.hasBalance, opening.balance);
    const name = (g.account.bankName || '不明') + (g.account.accountNumber ? ` (${g.account.accountNumber})` : '');
    // 口座の分からない読み飛ばし行は、最初の口座にだけ出す（同じ行を2回数えない）
    const skipped = statement.skipped.filter(
      (s) => accountIdentity(s) === key || (!s.accountNumber && g === groups[0]),
    );
    return {
      ...previewFile(`${filename} - ${name}`, groupRows, g.account, statement.hasBalance, index, skipped, opening.balance),
      originalFilename: filename,
      isSplit: true as const,
    };
  });
}

// 残高のつながりの出発点: 読み飛ばした行のうち、残高があり、その口座の最初の取引より前にある最後の行。
// 口座番号の無い行はどの口座のものとしても使う（account が null＝口座が1つのファイルなら全部）
function openingOf(skipped: SkippedRow[], rows: StatementRow[], account: string | null): { balance: number | null } {
  const firstLine = Math.min(...rows.map((r) => r.line));
  const hit = skipped
    .filter(
      (s) =>
        s.balance !== null &&
        s.line < firstLine &&
        (account === null || !s.accountNumber || accountIdentity(s) === account),
    )
    .at(-1);
  return { balance: hit?.balance ?? null };
}

function previewFile<T extends BalanceChecked<StatementRow>>(
  filename: string,
  rows: T[],
  detected: DetectedAccount,
  hasBalance: boolean,
  index: ExistingIndex,
  skippedRows: SkippedRow[],
  openingBalance: number | null,
): PreviewFile {
  const marked = markDuplicates(rows, index, detected);
  return {
    filename,
    rowCount: rows.length,
    duplicateCount: marked.duplicateCount,
    duplicateRun: maxDuplicateRun(marked.rows),
    warning: buildDuplicateWarning(marked.rows, marked.duplicateCount, rows.length),
    detectedAccount: detected,
    hasBalance,
    rows: marked.rows,
    skippedRows,
    openingBalance: hasBalance ? openingBalance : null,
  };
}

// 口座の同一性（銀行名・支店名・口座番号）で分ける（出てきた順）。種別はその口座の最初の行から取る。
export function groupRowsByAccount<T extends StatementRow>(rows: T[]): { account: DetectedAccount; rows: T[] }[] {
  const groups = new Map<string, { account: DetectedAccount; rows: T[] }>();
  for (const r of rows) {
    const key = accountIdentity(r);
    let g = groups.get(key);
    if (!g) {
      g = {
        account: {
          bankName: r.bankName ?? '',
          branchName: r.branchName ?? '',
          accountType: r.accountType ?? '',
          accountNumber: r.accountNumber ?? '',
        },
        rows: [],
      };
      groups.set(key, g);
    }
    g.rows.push(r);
  }
  return [...groups.values()];
}

// 口座が1つのファイル。中身の先頭の行（残高があれば日付順に並べた後の先頭）から取り、
// 銀行名・口座番号が無ければファイル名から推測する。
export function detectAccount(first: StatementRow | undefined, filename: string): DetectedAccount {
  const detected: DetectedAccount = {
    bankName: first?.bankName ?? '',
    branchName: first?.branchName ?? '',
    accountType: first?.accountType ?? '',
    accountNumber: first?.accountNumber ?? '',
  };
  if (!detected.bankName) {
    const hit = BANK_NAME_PATTERNS.find(([pattern]) => pattern.test(filename));
    if (hit) detected.bankName = hit[1];
  }
  if (!detected.accountNumber) {
    detected.accountNumber = ACCOUNT_NUMBER_IN_FILENAME.exec(filename)?.[0] ?? '';
  }
  return detected;
}

export type CommitAccount = {
  bankName: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
};

export type CommitRow = {
  date: string;
  description: string | null;
  amountOut: number;
  amountIn: number;
  balance: number | null;
  // 依頼24。CSV に書かれていた／画面で選んだ分類（無ければ自動分類）・メモ・付箋
  category?: string;
  memo?: string;
  flagged?: boolean;
  // 依頼25。分類がどこから来たか（取込の結果の内訳に使うだけ。取込の中身は変えない）:
  // csv=CSV に書かれていた・manual=手順3で人が選んだ・remap=知らない分類名を手順3で読み替えた
  categorySource?: 'csv' | 'manual' | 'remap';
};

// 取り込む行を決める。画面で決めた口座を当ててから、DB の最新の状態で重複を判定し直す
// （プレビューの後に別の取込が入っていても二重にならないように）。index は消費される。
export function selectRowsToCommit<T extends CommitRow>(
  rows: T[],
  account: CommitAccount,
  index: ExistingIndex,
  skipDuplicates: boolean,
): { rows: (T & CommitAccount & DuplicateMark)[]; skipped: number; firstKept: boolean } {
  const withAccount = rows.map((r) => ({ ...r, ...account }));
  const marked = markDuplicates(withAccount, index, account);
  if (!skipDuplicates) return { rows: marked.rows, skipped: 0, firstKept: marked.rows.length > 0 };
  const kept = marked.rows.filter((r) => !r.isDuplicate);
  // 先頭の行を入れたか（入れていなければ、繰越の残高は今回の行の出発点にならない）
  return { rows: kept, skipped: marked.rows.length - kept.length, firstKept: marked.rows[0]?.isDuplicate === false };
}
