import { describe, it, expect } from 'vitest';
import { continuationPageCells, mainPageCells } from '../Table5Grid';
import { formatAmount, formatCommaInteger } from '@/lib/numberFormat';

// 第5表は「表示のたびに整形し直す」経路を持つ（GridForm が入力欄の value を毎回作り直す）。
// commaInteger は数字以外を落とすので、金額欄・計算欄に被せると
// ⑤の△（債務超過）も⑪の分数等の小数も、値が入っているのに静かに消える。
// この describe はその再発防止。
describe('第5表のセル定義：符号と小数が表示で落ちないこと', () => {
  const AMOUNT_FIELD = /^[al]_\d+_[23]$/;
  const COMPUTED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', 'イ', 'ロ', 'ハ'];

  it('commaInteger は符号も小数も落とす（計算欄に被せてはいけない理由）', () => {
    expect(formatAmount(-20000)).toBe('△20,000');
    expect(formatCommaInteger('△20,000')).toBe('20,000'); // ⑤の△が消える
    expect(formatAmount(0.0005)).toBe('0.0005');
    expect(formatCommaInteger('0.0005')).toBe('5');       // ⑪の分数等が壊れる
  });

  it('資産・負債の金額欄は符号付き（控除項目はマイナスで入る）', () => {
    const cells = [...mainPageCells, ...continuationPageCells(1)]
      .filter((c) => c.field && AMOUNT_FIELD.test(c.field));
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      expect(cell.signedCommaInteger, cell.field).toBe(true);
      expect(cell.commaInteger, cell.field).toBeFalsy();
    }
  });

  it('計算欄は読み取り専用で、整形済みの文字列をそのまま出す', () => {
    for (const field of COMPUTED) {
      const cell = mainPageCells.find((c) => c.field === field && c.kind === 'input');
      expect(cell, field).toBeDefined();
      expect(cell!.readOnly, field).toBe(true);
      expect(cell!.commaInteger, field).toBeFalsy();
      expect(cell!.signedCommaInteger, field).toBeFalsy();
    }
  });
});
