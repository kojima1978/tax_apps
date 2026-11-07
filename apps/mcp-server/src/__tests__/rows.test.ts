/**
 * 明細行の表。入れ替えなので「消える行」を取り違えると気づけない壊れ方をする。
 *
 * 続紙の枚数欄を見るテストが要点。行だけ書いて枚数を足し忘れると、保存はされているのに
 * 画面にも印刷にも出ない ── 誰も気づけない入り方になる（旧実装が実際にそうだった）。
 */
import { describe, expect, it } from 'vitest';
import type { CaseData } from '../catalog.js';
import { applyRows, findRowTable, readRows } from '../rows.js';
import { catalog } from './fixtures.js';

const balanceSheet = findRowTable(catalog, 'balanceSheet');
const shareholders = findRowTable(catalog, 'shareholders');

const existing: CaseData = {
  table5: {
    a_1_1: '現金及び預金',
    a_1_2: '1,000',
    a_1_3: '1,000',
    a_2_1: '売掛金',
    a_2_2: '500',
    a_2_3: '500',
    l_1_1: '買掛金',
    l_1_2: '300',
    l_1_3: '300',
  },
  table4: { f28: '1,000' },
};

/** 指定した行数ぶんの行を作る（上限・枚数まわりの確認用）。 */
function filler(count: number): { name: string }[] {
  return Array.from({ length: count }, (_, i) => ({ name: `科目${i + 1}` }));
}

describe('表の引き当て', () => {
  it('id で引ける', () => {
    expect(balanceSheet.table).toBe('table5');
    expect(shareholders.table).toBe('table1_1');
  });

  it('無い id は候補を添えて弾く', () => {
    expect(() => findRowTable(catalog, 'table5')).toThrow(
      '指定できるのは balanceSheet（第5表） / shareholders（第1表の1）',
    );
  });
});

describe('明細の読み出し', () => {
  it('入力済みの行だけを返す', () => {
    const rows = readRows(balanceSheet, existing, 'a');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      row: 1,
      values: { name: '現金及び預金', evaluated: '1,000', book: '1,000', note: '' },
    });
  });

  it('間が空いていても行番号を保ったまま返す', () => {
    const rows = readRows(balanceSheet, { table5: { a_5_1: '土地' } }, 'a');
    expect(rows).toEqual([
      { row: 5, values: { name: '土地', evaluated: '', book: '', note: '' } },
    ]);
  });

  // 株主の表は列の保存キーが 1/4/7/5 と飛んでいる（様式の欄の並びがそうなっている）。
  it('列の保存キーは辞書のとおりに読む', () => {
    const rows = readRows(shareholders, { table1_1: { sh_1_1: '山田太郎', sh_1_4: '1,000' } }, 'sh');
    expect(rows).toEqual([
      { row: 1, values: { name: '山田太郎', shares: '1,000', undivided: '', votes: '' } },
    ]);
  });
});

describe('明細の入れ替え', () => {
  it('1行目から詰め直し、その側の古い行は消す', () => {
    const { data, sides } = applyRows(catalog, existing, 'balanceSheet', {
      asset: [{ name: '土地', evaluated: 8000, book: 5000, note: '土地等' }],
    });

    expect(data.table5?.a_1_1).toBe('土地');
    expect(data.table5?.a_1_2).toBe('8,000');
    expect(data.table5?.a_1_3).toBe('5,000');
    expect(data.table5?.a_1_4).toBe('土地等');
    expect(data.table5?.a_2_1).toBeUndefined();

    expect(sides).toHaveLength(1);
    expect(sides[0]?.before.map((r) => r.values.name)).toEqual(['現金及び預金', '売掛金']);
    expect(sides[0]?.after.map((r) => r.values.name)).toEqual(['土地']);
  });

  it('指定しなかった側と他の表はそのまま', () => {
    const { data } = applyRows(catalog, existing, 'balanceSheet', { asset: [{ name: '土地' }] });
    expect(data.table5?.l_1_1).toBe('買掛金');
    expect(data.table4?.f28).toBe('1,000');
  });

  it('元のデータは書き換えない', () => {
    applyRows(catalog, existing, 'balanceSheet', { asset: [{ name: '土地' }] });
    expect(existing.table5?.a_2_1).toBe('売掛金');
  });

  it('空欄は保存しない', () => {
    const { data } = applyRows(catalog, {}, 'balanceSheet', {
      asset: [{ name: '土地', book: 5000 }],
    });
    expect(data.table5?.a_1_3).toBe('5,000');
    expect(data.table5?.a_1_2).toBeUndefined();
    expect(data.table5?.a_1_4).toBeUndefined();
  });

  // 貸倒引当金のような控除項目はマイナスで入る。
  it('金額欄はマイナスを受け付ける', () => {
    const { data } = applyRows(catalog, {}, 'balanceSheet', {
      asset: [{ name: '貸倒引当金', evaluated: -120, book: -120 }],
    });
    expect(data.table5?.a_1_2).toBe('△120');
  });

  it('科目が空の行は弾く', () => {
    expect(() =>
      applyRows(catalog, {}, 'balanceSheet', { asset: [{ name: '土地' }, { name: '', book: 100 }] }),
    ).toThrow(/空行を挟むと以降の行がずれる/);
  });

  it('備考は側ごとの選択肢に照らす', () => {
    expect(() =>
      applyRows(catalog, {}, 'balanceSheet', { asset: [{ name: '土地', note: '不動産' }] }),
    ).toThrow(/選択肢にありません/);
    expect(() =>
      applyRows(catalog, {}, 'balanceSheet', { liability: [{ name: '買掛金', note: '株式等' }] }),
    ).toThrow(/選べるのは なし/);
  });

  // 列名の打ち間違いを黙って捨てると「入れたのに入っていない」になる。
  it('辞書に無い列名は弾く', () => {
    expect(() =>
      applyRows(catalog, {}, 'balanceSheet', { asset: [{ name: '土地', amount: 8000 }] }),
    ).toThrow('amount という列はありません');
  });

  it('行数の上限を超えたら弾く', () => {
    expect(() =>
      applyRows(catalog, {}, 'balanceSheet', { asset: filler(balanceSheet.maxRows + 1) }),
    ).toThrow(/上限を超えています/);
  });

  it('側を1つも指定しなければ弾く', () => {
    expect(() => applyRows(catalog, {}, 'balanceSheet', {})).toThrow(
      /取り込む側が指定されていません/,
    );
  });

  it('0行を指定するとその側は空になる', () => {
    const { data, sides } = applyRows(catalog, existing, 'balanceSheet', { asset: [] });
    expect(data.table5?.a_1_1).toBeUndefined();
    expect(data.table5?.l_1_1).toBe('買掛金');
    expect(sides[0]?.after).toHaveLength(0);
  });
});

describe('続紙の枚数', () => {
  it('本表に収まるなら枚数は触らない', () => {
    const { data, pages } = applyRows(catalog, {}, 'balanceSheet', {
      asset: filler(balanceSheet.mainRows),
    });
    expect(pages).toEqual({ field: '_pages', before: 1, after: 1 });
    expect(data.table5?._pages).toBeUndefined();
  });

  it('本表を1行でも超えたら続紙を1枚足す', () => {
    const { data, pages } = applyRows(catalog, {}, 'balanceSheet', {
      asset: filler(balanceSheet.mainRows + 1),
    });
    expect(pages.after).toBe(2);
    expect(data.table5?._pages).toBe('2');
  });

  it('続紙2枚ぶんに届けば2枚足す', () => {
    const { data } = applyRows(catalog, {}, 'balanceSheet', {
      asset: filler(balanceSheet.mainRows + balanceSheet.contRows + 1),
    });
    expect(data.table5?._pages).toBe('3');
  });

  // 人が続紙を足して手で書き始めているかもしれないので、枚数は減らさない。
  it('入っている枚数より少なくはしない', () => {
    const { data, pages } = applyRows(catalog, { table5: { _pages: '4' } }, 'balanceSheet', {
      asset: [{ name: '土地' }],
    });
    expect(pages).toEqual({ field: '_pages', before: 4, after: 4 });
    expect(data.table5?._pages).toBe('4');
  });

  // 枚数は表に1つなので、もう一方の側に残っている行も数に入れる。
  it('指定しなかった側の行も枚数の判断に入れる', () => {
    const deep: CaseData = { table5: { l_40_1: '長期借入金' } };
    const { data } = applyRows(catalog, deep, 'balanceSheet', { asset: [{ name: '土地' }] });
    expect(data.table5?._pages).toBe('3');
  });
});

describe('株主の明細', () => {
  it('辞書どおりの保存キーへ入る', () => {
    const { data } = applyRows(catalog, { table1_1: { f12: 'テスト商事' } }, 'shareholders', {
      shareholder: [
        { name: '山田太郎', shares: 6000, votes: 6000 },
        { name: '山田花子', shares: 4000, undivided: 500, votes: 4000 },
      ],
    });
    expect(data.table1_1?.sh_1_1).toBe('山田太郎');
    expect(data.table1_1?.sh_1_4).toBe('6,000');
    expect(data.table1_1?.sh_1_5).toBe('6,000');
    expect(data.table1_1?.sh_2_7).toBe('500');
    // 同じ表にある会社情報の欄は触らない
    expect(data.table1_1?.f12).toBe('テスト商事');
  });

  it('続紙の枚数は本表のみを 0 と数える', () => {
    const only = applyRows(catalog, {}, 'shareholders', {
      shareholder: filler(shareholders.mainRows),
    });
    expect(only.pages).toEqual({ field: '_shpages', before: 0, after: 0 });
    expect(only.data.table1_1?._shpages).toBeUndefined();

    const over = applyRows(catalog, {}, 'shareholders', {
      shareholder: filler(shareholders.mainRows + 1),
    });
    expect(over.data.table1_1?._shpages).toBe('1');
  });

  it('株式数はマイナスを受け付けない', () => {
    expect(() =>
      applyRows(catalog, {}, 'shareholders', { shareholder: [{ name: '山田太郎', shares: -1 }] }),
    ).toThrow(/マイナスを受け付けません/);
  });

  it('第5表の列名は使えない', () => {
    expect(() =>
      applyRows(catalog, {}, 'shareholders', { shareholder: [{ name: '山田太郎', book: 100 }] }),
    ).toThrow('book という列はありません');
  });
});
