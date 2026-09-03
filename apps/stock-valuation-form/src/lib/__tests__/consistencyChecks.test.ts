import { describe, expect, it } from 'vitest';
import { consistencyIssues, hasCheckableInput } from '@/lib/consistencyChecks';
import type { TableId } from '@/types/form';

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
});
