// 分類を Django 版の記録（test-data/golden/expected/fuzzy.json・classify.json）と突き合わせる。
//
// fuzzy.json: rapidfuzz の点数そのもの（小数4桁に丸めて記録）。キーワードは既定のパターンと
//             シナリオの案件固有パターンを合わせたもの全部。
// classify.json: 出金 0 / 999,999 / 1,000,000 円での分類と候補。共通パターンだけの場合と、
//                案件固有パターンがある場合。点数は丸めずに一致させる。

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FUZZY_CONFIG,
  DEFAULT_GIFT_THRESHOLD,
  DEFAULT_PATTERNS,
  normalizePatterns,
  type Patterns,
} from '../lib/categories.js';
import {
  classifyByRules,
  classifyTransactions,
  classifyUnclassified,
  fuzzySuggestions,
  matchScore,
  matchWithPriority,
  type ClassifierSettings,
} from '../lib/classify.js';
import { extractOne, partialRatio, ratio, tokenSetRatio } from '../lib/fuzz.js';
import { pyRound } from '../lib/pyRound.js';

const EXPECTED = path.resolve('test-data/golden/expected');
const readJson = <T>(name: string): T => JSON.parse(fs.readFileSync(path.join(EXPECTED, name), 'utf8')) as T;

type FuzzyGolden = { keywords: string[]; rows: { text: string; scores: Record<string, [number, number]> }[] };
type Verdict = [string, number];
type ClassifyGolden = Record<
  string,
  {
    fuzzy_config: { enabled: boolean; threshold: number; use_token_set_ratio: boolean };
    case_patterns: Patterns | null;
    rows: { text: string; out_0: Verdict; out_999999: Verdict; out_1000000: Verdict; suggestions: Verdict[] }[];
  }
>;

const fuzzyGolden = readJson<FuzzyGolden>('fuzzy.json');
const classifyGolden = readJson<ClassifyGolden>('classify.json');

describe('rapidfuzz の点数（fuzzy.json）', () => {
  it('記録に使ったキーワードは既定のパターン + 案件固有パターン', () => {
    const casePatterns = classifyGolden.with_case_patterns!.case_patterns!;
    const universe = new Set([...Object.values(DEFAULT_PATTERNS), ...Object.values(casePatterns)].flat());
    // Python の sorted() と同じコードポイント順で比べる
    expect(fuzzyGolden.keywords).toEqual([...universe].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  });

  it.each(fuzzyGolden.rows.map((r) => [r.text, r] as const))('%s', (_text, row) => {
    const actual = Object.fromEntries(
      fuzzyGolden.keywords.map((kw) => [kw, [pyRound(partialRatio(row.text, kw), 4), pyRound(tokenSetRatio(row.text, kw), 4)]]),
    );
    expect(actual).toEqual(row.scores);
  });
});

describe('分類（classify.json）', () => {
  describe.each(Object.entries(classifyGolden))('%s', (_label, golden) => {
    const settings: ClassifierSettings = {
      globalPatterns: DEFAULT_PATTERNS,
      casePatterns: golden.case_patterns,
      giftThreshold: DEFAULT_GIFT_THRESHOLD,
      fuzzy: {
        enabled: golden.fuzzy_config.enabled,
        threshold: golden.fuzzy_config.threshold,
        useTokenSetRatio: golden.fuzzy_config.use_token_set_ratio,
      },
    };
    const verdict = (text: string, out: number): Verdict => {
      const c = classifyByRules(text, out, settings);
      return [c.category, c.score];
    };

    it.each(golden.rows.map((r) => [r.text, r] as const))('%s', (text, row) => {
      expect({
        out_0: verdict(text, 0),
        out_999999: verdict(text, 999_999),
        out_1000000: verdict(text, 1_000_000),
        suggestions: fuzzySuggestions(text, settings).map((s) => [s.category, s.score]),
      }).toEqual({
        out_0: row.out_0,
        out_999999: row.out_999999,
        out_1000000: row.out_1000000,
        suggestions: row.suggestions,
      });
    });
  });
});

describe('fuzz の端', () => {
  it('空文字', () => {
    expect(partialRatio('', '')).toBe(100);
    expect(partialRatio('', 'a')).toBe(0);
    expect(tokenSetRatio('', 'a')).toBe(0);
    expect(tokenSetRatio('   ', 'a')).toBe(0);
    expect(ratio('', '')).toBe(100);
  });

  it('全角スペースで単語を分ける', () => {
    expect(tokenSetRatio('振込\u3000ヤマダ', 'ヤマダ')).toBe(100);
  });

  it('同じ長さは向きを入れ替えても見る', () => {
    expect(partialRatio('abcd', 'dcba')).toBe(partialRatio('dcba', 'abcd'));
  });

  it('extractOne は同点なら先の方、cutoff 未満は null', () => {
    expect(extractOne('abc', ['abx', 'abc', 'abc'], ratio, 0)).toEqual({ choice: 'abc', score: 100, index: 1 });
    expect(extractOne('abc', ['xyz'], ratio, 50)).toBeNull();
  });
});

// classify.json にはあいまい一致で決まった行が無い（日本語の摘要は空白で区切られないので
// token_set_ratio が 90 に届かない）。評価の順番はここで押さえる。
describe('あいまい一致の順番', () => {
  // 単語の並びが違うだけなら部分一致はせず、token_set_ratio は 100
  const text = 'qrst abcdefghijklmnopqrs';
  const exact = 'abcdefghijklmnopqrs qrst';
  const near95 = 'abcdefghijklmnopqrX qrst'; // 100 - 200/48 = 95.83…
  const near93 = 'abcdefghijklmnopqXY qrst'; // 100 - 400/48 = 91.66…
  const run = (globalPatterns: Patterns, casePatterns?: Patterns) =>
    classifyByRules(text, 0, { globalPatterns, casePatterns, giftThreshold: DEFAULT_GIFT_THRESHOLD, fuzzy: DEFAULT_FUZZY_CONFIG });

  it('点数は小数のまま返す', () => {
    expect(run({ A: [near93] })).toEqual({ category: 'A', score: 100 - 400 / 48 });
  });

  it('案件固有が 95 未満なら共通の高い方を取る', () => {
    expect(run({ G: [exact] }, { C: [near93] })).toEqual({ category: 'G', score: 100 });
  });

  it('95 以上が出たら残りを見ない', () => {
    expect(run({ G: [exact] }, { C: [near95] })).toEqual({ category: 'C', score: 100 - 200 / 48 });
  });

  it('同点ならキーワード数の少ないカテゴリー（並びは先でも後でも）', () => {
    expect(run({ A: ['zzz', 'yyy', near93], B: [near93] })).toEqual({ category: 'B', score: 100 - 400 / 48 });
  });

  it('案件固有にあるキーワードは共通の側で数え直さない', () => {
    // 共通の A は案件固有と同じキーワードを除くと空になり、評価されない
    expect(run({ A: [near93] }, { A: [near93], C: ['zzz'] })).toEqual({ category: 'A', score: 100 - 400 / 48 });
  });
});

describe('取込・ボタンからの分類', () => {
  const settings: ClassifierSettings = {
    globalPatterns: DEFAULT_PATTERNS,
    giftThreshold: DEFAULT_GIFT_THRESHOLD,
    fuzzy: DEFAULT_FUZZY_CONFIG,
  };

  it('取込: 同じ摘要は最初の行の結果を使い回す（出金額が違っても）', () => {
    const rows = [
      { description: '振込 ヤマダ', amountOut: 2_000_000 },
      { description: '振込 ヤマダ', amountOut: 1000 },
      { description: '振込 スズキ', amountOut: 1000 },
      { description: '振込 スズキ', amountOut: 5_000_000 },
      { description: null, amountOut: 0 },
      { description: '', amountOut: 0 },
    ];
    expect(classifyTransactions(rows, settings).map((c) => c.category)).toEqual([
      '贈与・教育費', '贈与・教育費', '未分類', '未分類', '未分類', '未分類',
    ]);
  });

  it('古いカテゴリー名は寄せて、キーワードの重複は除く', () => {
    expect([...normalizePatterns({ '銀行': ['定期'], '銀行・利息・手数料': ['定期', '積立'] })]).toEqual([
      ['銀行・利息・手数料', ['定期', '積立']],
    ]);
  });

  it('ルール適用: 書いた順・贈与の閾値なし・案件固有は case', () => {
    const txs = [
      { id: 1, description: '振込 ヤマダ', amountOut: 1000, category: '未分類', isFlagged: false },
      { id: 2, description: 'イオン', amountOut: 1000, category: '未分類', isFlagged: true },
      { id: 3, description: 'イオン', amountOut: 1000, category: '生活費', isFlagged: false },
      { id: 4, description: 'ヤマダ', amountOut: 1000, category: '未分類', isFlagged: false },
    ];
    expect(classifyUnclassified(txs, { ...settings, casePatterns: { '家族': ['ヤマダ'] } }, { useFuzzy: false })).toEqual([
      { id: 1, category: '家族' },
      { id: 4, category: '家族' },
    ]);
    expect(classifyUnclassified(txs, settings, { useFuzzy: false })).toEqual([{ id: 1, category: '贈与・教育費' }]);
    expect(matchWithPriority('ヤマダ', { '家族': ['ヤマダ'] }, DEFAULT_PATTERNS)?.matchType).toBe('case');
    expect(matchWithPriority('ATM', null, DEFAULT_PATTERNS)).toEqual({ category: 'その他', keyword: 'ATM', matchType: 'exact' });
  });

  it('自動分類: 点数は切り捨てて入れ、minScore は切り捨てる前の値と比べる', () => {
    const txs = [{ id: 1, description: 'ｾﾌﾞﾝｲﾚﾌﾞﾝ', amountOut: 0, category: '未分類', isFlagged: false }];
    const s = { ...settings, casePatterns: { '生活費': ['ｾﾌﾞﾝ'] } };
    expect(classifyUnclassified(txs, s, { useFuzzy: true })).toEqual([{ id: 1, category: '生活費', classificationScore: 100 }]);
  });

  it('プレビューの信頼度', () => {
    expect(matchScore('exact', 'ATM', 'ATM')).toBe(100);
    expect(matchScore('case', 'x', 'xyz')).toBe(95);
    expect(matchScore('partial', 'ATM', 'ATM 引出 1234567890')).toBe(74);
  });
});
