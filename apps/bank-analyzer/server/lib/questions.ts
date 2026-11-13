// 「お客様への確認事項」の書面まわりの決めごと（DB に依存しない。画面からも読む）。
//
// - 書面に出すのは、質問候補（付箋）のうち質問メモが書いてある取引だけ。
//   付箋だけ付けてメモの無いものは事務所内の覚え書きとして扱い、お客様には出さない
// - 口座番号は下4桁だけ出す。お客様ご本人は金融機関・支店・種別・下4桁で口座が分かり、
//   メールで送った書面が他人の手に渡っても番号の全部は漏れない
// - 質問文の下書きは定型文から選ぶだけ。入れるのは人がボタンを押したときで、ここは文を作るだけ

import { GIFT_CATEGORY, TRANSFER_CATEGORY } from './categories.js';
import { warekiFull } from './dates.js';

export const QUESTION_SHEET_TITLE = 'お客様への確認事項';

export const QUESTION_SHEET_INTRO =
  '下記のお取引について内容をご確認のうえ、「ご回答」欄にご記入をお願いいたします。お分かりにならないものは「不明」とご記入ください。';

export const QUESTION_SHEET_COLUMNS = ['番号', '日付', '金融機関・口座', '摘要', '出金', '入金', 'ご確認いただきたい内容', 'ご回答'] as const;

// ---------------------------------------------------------------------------
// 口座の書き方
// ---------------------------------------------------------------------------

const ACCOUNT_TAIL = 4;

// 下4桁だけ（4桁以下の番号はそのまま）
export function maskAccountNumber(accountNumber: string | null | undefined): string {
  const n = (accountNumber ?? '').trim();
  if (!n) return '';
  const chars = [...n];
  return chars.length <= ACCOUNT_TAIL ? n : `末尾${chars.slice(-ACCOUNT_TAIL).join('')}`;
}

type AccountParts = {
  bankName: string | null;
  branchName: string | null;
  accountType: string | null;
  accountNumber: string | null;
};

// 1行目: 金融機関と支店 / 2行目: 種別と口座番号の下4桁。空の行は落とす
export function questionAccountLines(a: AccountParts): string[] {
  const join = (...parts: (string | null | undefined)[]) => parts.map((p) => (p ?? '').trim()).filter(Boolean).join(' ');
  return [join(a.bankName, a.branchName), join(a.accountType, maskAccountNumber(a.accountNumber))].filter(Boolean);
}

// ---------------------------------------------------------------------------
// 書面に出す行
// ---------------------------------------------------------------------------

export const hasQuestion = (memo: string | null | undefined): boolean => (memo ?? '').trim() !== '';

// 書面の日付（和暦の長い形。日付の無い取引は空欄）
export const questionDate = (iso: string | null): string => (iso ? warekiFull(iso) : '');

// ---------------------------------------------------------------------------
// 質問文の下書き
// ---------------------------------------------------------------------------

export const QUESTION_TEMPLATE_FIELDS = [
  { key: 'withdrawal', label: '出金', help: 'ほかのどれにも当たらない出金' },
  { key: 'deposit', label: '入金', help: 'ほかのどれにも当たらない入金' },
  { key: 'afterReferenceOut', label: '基準日以後の出金', help: '基準日（相続開始日）の当日とその後の出金' },
  { key: 'transferOut', label: '資金移動の出金（相手が見つからない）', help: '分類が「通帳間移動」か振替の印があるのに、取り込んだ口座の中に入金側が無い出金' },
  { key: 'transferIn', label: '資金移動の入金（相手が見つからない）', help: '同じく、出金側が無い入金' },
  { key: 'giftOut', label: `「${GIFT_CATEGORY}」の出金`, help: `分類が「${GIFT_CATEGORY}」の出金` },
  { key: 'insurance', label: '「保険会社」の取引', help: '分類が「保険会社」の出金・入金' },
] as const;

export type QuestionTemplateKey = (typeof QUESTION_TEMPLATE_FIELDS)[number]['key'];
export type QuestionTemplates = Record<QuestionTemplateKey, string>;

export const DEFAULT_QUESTION_TEMPLATES: QuestionTemplates = {
  withdrawal: 'このお引き出しの使いみちをお教えください。',
  deposit: 'このご入金の内容（どなたから・何の代金か）をお教えください。',
  afterReferenceOut: '相続開始後のお引き出しです。使いみち（葬儀費用・医療費のお支払いなど）をお教えください。',
  transferOut: 'お預け替え・お振込みと思われます。移動先（金融機関・支店・口座の名義）をお教えください。',
  transferIn: 'ほかの口座からのお預け替えと思われます。移動元（金融機関・支店・口座の名義）をお教えください。',
  giftOut: 'このお振込みの相手の方（ご関係）と、お振込みの理由をお教えください。',
  insurance: 'この保険のご契約の内容（契約者・被保険者・受取人）をお教えください。保険証券があればご用意ください。',
};

export const QUESTION_TEMPLATE_MAX = 200;

// 文の中で置き換える語（置き換えなくても文は成り立つ。書面の表にも同じ値が出るため）
export const QUESTION_PLACEHOLDERS = ['{日付}', '{金額}', '{摘要}'] as const;

const INSURANCE_CATEGORY = '保険会社';

// 保存値から読む。文字列でないもの・空のものは既定の文へ戻す（空の質問は書面に出せないため）
export function parseQuestionTemplates(raw: unknown): QuestionTemplates {
  const v = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_QUESTION_TEMPLATES };
  for (const { key } of QUESTION_TEMPLATE_FIELDS) {
    const s = v[key];
    if (typeof s === 'string' && s.trim()) out[key] = s.trim();
  }
  return out;
}

export type DraftTx = {
  id: number;
  date: string | null;
  description: string | null;
  amountOut: number;
  amountIn: number;
  category: string;
  isTransfer: boolean;
};

export type DraftContext = {
  templates: QuestionTemplates;
  // 基準日（相続開始日）。無ければ前後は見ない
  referenceDate: string | null;
  // 資金移動の組になった取引（画面の資金移動タブと同じ判定）
  pairedIds: ReadonlySet<number>;
};

// どの定型文を使うか。上から順に当てる
export function questionTemplateKey(t: DraftTx, ctx: Pick<DraftContext, 'referenceDate' | 'pairedIds'>): QuestionTemplateKey {
  // 出金と入金の両方が入った行は出金として扱う（通帳の訂正行など。まれ）
  const out = t.amountOut > 0 || t.amountIn === 0;
  if (t.category === INSURANCE_CATEGORY) return 'insurance';
  if (out && t.category === GIFT_CATEGORY) return 'giftOut';
  if ((t.category === TRANSFER_CATEGORY || t.isTransfer) && !ctx.pairedIds.has(t.id)) return out ? 'transferOut' : 'transferIn';
  if (out && ctx.referenceDate && t.date && t.date >= ctx.referenceDate) return 'afterReferenceOut';
  return out ? 'withdrawal' : 'deposit';
}

export function draftQuestion(t: DraftTx, ctx: DraftContext): string {
  const amount = t.amountOut > 0 ? t.amountOut : t.amountIn;
  const values: Record<(typeof QUESTION_PLACEHOLDERS)[number], string> = {
    '{日付}': questionDate(t.date),
    '{金額}': `${amount.toLocaleString('ja-JP')}円`,
    '{摘要}': (t.description ?? '').trim(),
  };
  return ctx.templates[questionTemplateKey(t, ctx)].replace(/\{日付\}|\{金額\}|\{摘要\}/g, (m) => values[m as keyof typeof values]);
}
