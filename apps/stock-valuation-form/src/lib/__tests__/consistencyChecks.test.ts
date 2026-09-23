import { describe, expect, it } from 'vitest';
import { consistencyIssues, hasCheckableInput } from '@/lib/consistencyChecks';
import type { TableId } from '@/types/form';
import { RETIREMENT_AMOUNT_FIELD } from '@/lib/retirementSimulation';
import { sampleGetField } from '@/__tests__/walkthrough/sampleCompany';
import { calcTable5 } from '@/components/tables/table5/Table5Grid';

/** 表ごとの値から getField を作る（未設定の欄は空文字） */
const makeGetField = (data: Partial<Record<TableId, Record<string, string>>>) =>
  (table: TableId, field: string) => data[table]?.[field] ?? '';

const messagesOf = (data: Partial<Record<TableId, Record<string, string>>>) =>
  consistencyIssues(makeGetField(data)).map((i) => i.message);

describe('consistencyIssues', () => {
  it('空の帳票では何も出さない', () => {
    expect(consistencyIssues(makeGetField({}))).toEqual([]);
    expect(hasCheckableInput(makeGetField({}))).toBe(false);
  });

  it('つじつまの合う入力では何も出さない（カンマ付きでも比較できる）', () => {
    const data = {
      table1_1: {
        '①': '4,000', '③': '6,000', '⑤': '12,000', '⑥': '10,000', f63: '2,000',
        f14_g: '令和', f14_y: '8', f14_m: '6', f14_d: '1',
        f15_from_g: '令和', f15_from_y: '7', f15_from_m: '4', f15_from_d: '1',
        f15_to_g: '令和', f15_to_y: '8', f15_to_m: '3', f15_to_d: '31',
      },
      table2: { f85_g: '平成', f85_y: '10', f85_m: '4', f85_d: '1' },
      table4: { f28: '1,000', f29: '200', f32: '900', f33: '0', f36: '800', f37: '' },
    };
    expect(messagesOf(data)).toEqual([]);
    expect(hasCheckableInput(makeGetField(data))).toBe(true);
  });

  it('議決権数が総数を超えていれば確認事項になる', () => {
    const issues = consistencyIssues(makeGetField({ table1_1: { '①': '11000', '③': '11000', '⑥': '10000' } }));
    expect(issues).toHaveLength(2);
    // 直せる欄（③・⑥）へ案内する。①は株主行からの自動集計なので指さない
    expect(issues.map((i) => i.field)).toEqual(['⑥', '③']);
    expect(issues.every((i) => i.tab === 'table1_1')).toBe(true);
  });

  it('納税義務者グループが筆頭株主グループを上回っていれば確認事項になる', () => {
    expect(messagesOf({ table1_1: { '①': '6000', '③': '5000', '⑥': '10000' } })).toHaveLength(1);
    // 納税義務者のグループ自身が筆頭のときは①＝③で正しい
    expect(messagesOf({ table1_1: { '①': '6000', '③': '6000', '⑥': '10000' } })).toEqual([]);
  });

  it('自己株式が発行済株式数を超える／議決権の総数が自己株式控除後を超える', () => {
    expect(messagesOf({ table1_1: { '⑤': '10000', f63: '12000' } })).toHaveLength(1);
    // 自己株式に議決権はないので ⑥ ≦ ⑤－自己株式
    expect(messagesOf({ table1_1: { '⑤': '10000', '⑥': '9000', f63: '2000' } })).toHaveLength(1);
    expect(messagesOf({ table1_1: { '⑤': '10000', '⑥': '8000', f63: '2000' } })).toEqual([]);
    // 単元株制度で議決権数が株式数より小さいのは正常
    expect(messagesOf({ table1_1: { '⑤': '10000', '⑥': '100' } })).toEqual([]);
  });

  it('直前期の末日が課税時期以後なら確認事項になる', () => {
    const dates = (toY: string, toM: string, toD: string) => ({
      table1_1: {
        f14_g: '令和', f14_y: '8', f14_m: '6', f14_d: '1',
        f15_to_g: '令和', f15_to_y: toY, f15_to_m: toM, f15_to_d: toD,
      },
    });
    expect(messagesOf(dates('8', '3', '31'))).toEqual([]);
    expect(messagesOf(dates('8', '6', '1'))).toHaveLength(1);  // 同日も直前期ではない
    expect(messagesOf(dates('8', '9', '30'))).toHaveLength(1);
  });

  it('直前期の自と至が逆なら確認事項になる', () => {
    const issues = consistencyIssues(makeGetField({
      table1_1: {
        f15_from_g: '令和', f15_from_y: '8', f15_from_m: '3', f15_from_d: '31',
        f15_to_g: '令和', f15_to_y: '7', f15_to_m: '4', f15_to_d: '1',
      },
    }));
    expect(issues.map((i) => i.field)).toEqual(['f15_from_y']);
  });

  it('開業年月日が課税時期より後なら確認事項になる', () => {
    const issues = consistencyIssues(makeGetField({
      table1_1: { f14_g: '令和', f14_y: '8', f14_m: '6', f14_d: '1' },
      table2: { f85_g: '令和', f85_y: '8', f85_m: '7', f85_d: '1' },
    }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ tab: 'table2', field: 'f85_y' });
  });

  it('非経常的な配当金額が年配当金額を超えていれば期ごとに確認事項になる', () => {
    const issues = consistencyIssues(makeGetField({
      table4: { f28: '100', f29: '150', f32: '100', f33: '80', f36: '100', f37: '120' },
    }));
    // 表示は第4表の1、データは table4 バケット
    expect(issues.map((i) => `${i.tab}.${i.field}`)).toEqual(['table4_1.f29', 'table4_1.f37']);
  });

  it('ⒸとⒸ₁で年利益金額の採り方が分かれたら、意図した組み合わせかを残す', () => {
    // ①10,000千円 → ⑤＝200,000株。直前期100千円・直前々期500千円。
    // 自動どうしでもⒸは単年（低い方）、Ⓒ₁は2年平均（0を避ける方）になり採り方が分かれる。
    const split = consistencyIssues(makeGetField({ table4: { '①': '10000', e18: '100', e25: '500' } }));
    expect(split).toHaveLength(1);
    expect(split[0]).toMatchObject({ tab: 'table4_1', field: 'e18' });
    expect(split[0]!.message).toContain('別々に選べる');
    // 同じ側を採っているなら出さない（誤りではないので、分かれたときだけ知らせる）
    expect(messagesOf({ table4: { '①': '10000', e18: '100', e25: '500', c1_mode: 'single' } })).toEqual([]);
  });
});

/** 資産・負債の明細行を第5表のフィールドへ展開する（科目・相続税評価額・帳簿価額） */
const detail = (prefix: 'a' | 'l', list: ReadonlyArray<readonly [string, string, string]>) =>
  Object.fromEntries(list.flatMap(([name, evaluated, book], index) => [
    [`${prefix}_${index + 1}_1`, name],
    [`${prefix}_${index + 1}_2`, evaluated],
    [`${prefix}_${index + 1}_3`, book],
  ]));

// ②（資産の帳簿価額の合計）＝150,000千円
const ASSETS = detail('a', [['現金預金', '100000', '100000'], ['土地', '150000', '50000']]);
// ④は引当金を除くので30,000千円 → ②－④＝120,000千円
const LIABILITIES = detail('l', [['買掛金', '30000', '30000'], ['賞与引当金', '8000', '8000']]);

describe('第5表と他表のつながり', () => {
  it('第５表の②と直前期末の総資産価額が2倍以上開いたら確認事項になる', () => {
    // 千円と円を取り違えた例（1,500,000千円）
    const issues = consistencyIssues(makeGetField({ table1_2: { f22: '1500000' }, table5: ASSETS }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ tab: 'table1_2', field: 'f22' });
    expect(issues[0]!.message).toContain('仮決算');
  });

  it('課税時期と直前期末のずれで数割動くだけなら出さない', () => {
    // 150,000千円 対 200,000千円（25％）
    expect(messagesOf({ table1_2: { f22: '200000' }, table5: ASSETS })).toEqual([]);
    // 片方しか入っていない間は比べない（入力の途中）
    expect(messagesOf({ table1_2: { f22: '1500000' } })).toEqual([]);
    expect(messagesOf({ table5: ASSETS })).toEqual([]);
  });

  it('第４表の⑲と第５表の②－④が2倍以上開いたら確認事項になる', () => {
    const issues = consistencyIssues(makeGetField({
      table4: { '①': '10000', n53: '10000' },  // ⑲＝20,000千円
      table5: { ...ASSETS, ...LIABILITIES },   // ②－④＝120,000千円
    }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ tab: 'table4_1', field: 'n53' });
    expect(issues[0]!.message).toContain('記載方法等 第５表 2⑶');
  });

  it('引当金の除外や税務簿価の差で収まる範囲なら出さない', () => {
    // ⑲＝100,000千円 対 ②－④＝120,000千円
    expect(messagesOf({
      table4: { '①': '10000', n53: '90000' },
      table5: { ...ASSETS, ...LIABILITIES },
    })).toEqual([]);
    // 負債がまだ未入力の間は比べない
    expect(messagesOf({ table4: { '①': '10000', n53: '10000' }, table5: ASSETS })).toEqual([]);
  });

  it('退職金を試算したまま第５表にも退職金の負債があれば、二重反映として出す', () => {
    const issues = consistencyIssues(makeGetField({
      table1_1: { [RETIREMENT_AMOUNT_FIELD]: '5,000' },
      table5: { ...ASSETS, ...detail('l', [['未払退職金', '5000', '5000']]) },
    }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ tab: 'table5', field: 'l_1_1' });
    expect(issues[0]!.message).toContain('二重');
  });

  it('試算の金額が入っていても、第５表に退職金の行が無ければ出さない', () => {
    // 試算欄は「帳票にまだ反映していない金額」を入れるところなので、未計上が通常の状態
    expect(messagesOf({
      table1_1: { [RETIREMENT_AMOUNT_FIELD]: '5000' },
      table5: { ...ASSETS, ...LIABILITIES },
    })).toEqual([]);
  });

  it('架空1社の入力一式では、第5表まわりの確認事項を出さない', () => {
    // 残る1件は第5表と無関係で、この会社の入力そのものから出るもの（Ⓒは直前期末以前
    // 2年間の平均、Ⓒ₁は直前期を基にしている）。誤りではないため文言も確認を促すだけ。
    const issues = consistencyIssues(sampleGetField);
    expect(issues.map((i) => `${i.tab}.${i.field}`)).toEqual(['table4_1.e18']);
  });
});

describe('第5表：様式に書かない欄・書かない資産', () => {
  it('現物出資等受入れ資産が①の20％以下なら、その欄は記載しない', () => {
    // ①＝250,000千円に対して30,000千円＝12.0％
    const issues = consistencyIssues(makeGetField({ table5: { ...ASSETS, 'ニ': '30000' } }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ tab: 'table5', field: 'ニ' });
    expect(issues[0]!.message).toContain('20％以下');
  });

  it('20％を超えていれば記載する欄なので何も出さない', () => {
    expect(messagesOf({ table5: { ...ASSETS, 'ニ': '60000' } })).toEqual([]);
  });

  it('繰延資産・繰延税金資産は財産性の確認を促すだけで、合計からは外さない', () => {
    const table5 = detail('a', [['現金預金', '100000', '100000'], ['繰延税金資産', '5000', '5000']]);
    const issues = consistencyIssues(makeGetField({ table5 }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ tab: 'table5', field: 'a_2_1' });
    expect(issues[0]!.message).toContain('財産性');
    // 財産性の有無は科目名では決まらない。黙って落とすと純資産価額が実際より小さく出る
    expect(calcTable5(makeGetField({ table5 }))['①']).toBe(105000);
  });
});
