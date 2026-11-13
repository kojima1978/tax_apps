// お客様への確認事項の決めごと（口座番号の出し方・下書きの選び方）。値はすべて架空。

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_QUESTION_TEMPLATES,
  draftQuestion,
  hasQuestion,
  maskAccountNumber,
  parseQuestionTemplates,
  questionAccountLines,
  questionTemplateKey,
  type DraftTx,
} from '../lib/questions.js';

const tx = (over: Partial<DraftTx> = {}): DraftTx => ({
  id: 1,
  date: '2025-04-01',
  description: 'ZZQ架空',
  amountOut: 0,
  amountIn: 0,
  category: '未分類',
  isTransfer: false,
  ...over,
});
const ctx = { templates: DEFAULT_QUESTION_TEMPLATES, referenceDate: null as string | null, pairedIds: new Set<number>() };

describe('口座の書き方', () => {
  it('口座番号は下4桁だけ。4桁以下はそのまま、空は空', () => {
    expect(maskAccountNumber('7654321')).toBe('末尾4321');
    expect(maskAccountNumber(' 12345 ')).toBe('末尾2345');
    expect(maskAccountNumber('1234')).toBe('1234');
    expect(maskAccountNumber('')).toBe('');
    expect(maskAccountNumber(null)).toBe('');
  });

  it('金融機関と支店・種別と番号の2行。空の行は落とす', () => {
    expect(questionAccountLines({ bankName: '架空銀行', branchName: '本店', accountType: '普通', accountNumber: '7654321' })).toEqual([
      '架空銀行 本店',
      '普通 末尾4321',
    ]);
    expect(questionAccountLines({ bankName: '架空銀行', branchName: null, accountType: null, accountNumber: null })).toEqual(['架空銀行']);
    expect(questionAccountLines({ bankName: null, branchName: null, accountType: null, accountNumber: null })).toEqual([]);
  });
});

describe('書面に出す行', () => {
  it('メモが空白だけの取引は質問なし', () => {
    expect(hasQuestion('使いみち')).toBe(true);
    expect(hasQuestion('  \n')).toBe(false);
    expect(hasQuestion(null)).toBe(false);
  });
});

describe('下書きの選び方', () => {
  it('出金・入金', () => {
    expect(questionTemplateKey(tx({ amountOut: 500000 }), ctx)).toBe('withdrawal');
    expect(questionTemplateKey(tx({ amountIn: 500000 }), ctx)).toBe('deposit');
  });

  it('基準日の当日とその後の出金は別の文。入金と基準日より前は変えない', () => {
    const after = { ...ctx, referenceDate: '2025-04-01' };
    expect(questionTemplateKey(tx({ amountOut: 1 }), after)).toBe('afterReferenceOut');
    expect(questionTemplateKey(tx({ amountOut: 1, date: '2025-03-31' }), after)).toBe('withdrawal');
    expect(questionTemplateKey(tx({ amountIn: 1, date: '2025-04-02' }), after)).toBe('deposit');
    expect(questionTemplateKey(tx({ amountOut: 1, date: null }), after)).toBe('withdrawal');
  });

  it('資金移動は相手が見つからないときだけ移動先・移動元を尋ねる', () => {
    const out = tx({ amountOut: 1, category: '通帳間移動' });
    expect(questionTemplateKey(out, ctx)).toBe('transferOut');
    expect(questionTemplateKey(tx({ amountIn: 1, isTransfer: true }), ctx)).toBe('transferIn');
    // 組になっているものは移動先が分かっている
    expect(questionTemplateKey(out, { ...ctx, pairedIds: new Set([1]) })).toBe('withdrawal');
  });

  it('保険会社は出入金とも、贈与・教育費は出金だけ', () => {
    expect(questionTemplateKey(tx({ amountIn: 1, category: '保険会社' }), ctx)).toBe('insurance');
    expect(questionTemplateKey(tx({ amountOut: 1, category: '保険会社' }), ctx)).toBe('insurance');
    expect(questionTemplateKey(tx({ amountOut: 1, category: '贈与・教育費' }), ctx)).toBe('giftOut');
    expect(questionTemplateKey(tx({ amountIn: 1, category: '贈与・教育費' }), ctx)).toBe('deposit');
  });

  it('文の中の {日付}・{金額}・{摘要} を取引の値に置き換える', () => {
    const templates = { ...DEFAULT_QUESTION_TEMPLATES, withdrawal: '{日付}の{金額}（{摘要}）の使いみち。{金額}' };
    expect(draftQuestion(tx({ amountOut: 1234567, date: '2024-01-26' }), { ...ctx, templates })).toBe(
      '令和6年1月26日の1,234,567円（ZZQ架空）の使いみち。1,234,567円',
    );
    expect(draftQuestion(tx({ amountIn: 500 }), ctx)).toBe(DEFAULT_QUESTION_TEMPLATES.deposit);
  });
});

describe('保存した文の読み方', () => {
  it('変えた文だけ上書きし、空・文字列でないもの・知らないキーは既定のまま', () => {
    const t = parseQuestionTemplates({ withdrawal: ' 架空の文 ', deposit: '', transferOut: 5, unknown: 'x' });
    expect(t.withdrawal).toBe('架空の文');
    expect(t.deposit).toBe(DEFAULT_QUESTION_TEMPLATES.deposit);
    expect(t.transferOut).toBe(DEFAULT_QUESTION_TEMPLATES.transferOut);
    expect(Object.keys(t)).toEqual(Object.keys(DEFAULT_QUESTION_TEMPLATES));
    expect(parseQuestionTemplates(null)).toEqual(DEFAULT_QUESTION_TEMPLATES);
    expect(parseQuestionTemplates(['x'])).toEqual(DEFAULT_QUESTION_TEMPLATES);
  });
});
