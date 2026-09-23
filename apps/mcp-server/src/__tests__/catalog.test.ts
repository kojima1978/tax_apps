/**
 * 値の検証。ここが外から入ってくる数字に対する唯一の関所なので、
 * 「通ってはいけないもの」を中心に固定する。
 */
import { describe, expect, it } from 'vitest';
import {
  applyFieldValues,
  findField,
  normalizeValue,
  readFieldValues,
  type CaseData,
} from '../catalog.js';
import { InputError } from '../errors.js';
import { catalog } from './fixtures.js';

const norm = (kind: 'integer' | 'signedInteger' | 'text' | 'enum', raw: unknown, options?: string[]) =>
  normalizeValue(catalog, kind, raw, 'テスト欄', options);

describe('値の書き方', () => {
  it('整数は3桁区切りにする', () => {
    expect(norm('integer', 1234567)).toBe('1,234,567');
    expect(norm('integer', 100)).toBe('100');
    expect(norm('integer', 0)).toBe('0');
  });

  it('すでに区切られている文字列もそのまま通る', () => {
    expect(norm('integer', '1,234')).toBe('1,234');
    expect(norm('integer', ' 12345 ')).toBe('12,345');
  });

  it('空の指定は空欄になる', () => {
    expect(norm('integer', null)).toBe('');
    expect(norm('integer', undefined)).toBe('');
    expect(norm('integer', '')).toBe('');
  });

  it('先頭の0は落とす', () => {
    expect(norm('integer', '007')).toBe('7');
    expect(norm('integer', '000')).toBe('0');
  });

  it('負数を受け付ける欄は△で書く', () => {
    expect(norm('signedInteger', -5678)).toBe('△5,678');
    expect(norm('signedInteger', '-5678')).toBe('△5,678');
    expect(norm('signedInteger', '△5,678')).toBe('△5,678');
  });

  it('マイナス0は0にする', () => {
    expect(norm('signedInteger', '-0')).toBe('0');
  });

  it('負数を受け付けない欄にマイナスを入れると弾く', () => {
    expect(() => norm('integer', -1)).toThrow(InputError);
    expect(() => norm('integer', -1)).toThrow(/マイナスを受け付けません/);
  });

  // 円で読み取った値を1000で割ってから渡すのは外部ツール側の仕事。
  // ここで四捨五入すると、丸めたことが誰にも見えないまま申告書に載る。
  it('小数は端数処理せず弾く', () => {
    expect(() => norm('integer', 1.5)).toThrow(/小数は受け付けません/);
    expect(() => norm('integer', '1.5')).toThrow(/小数は受け付けません/);
    expect(() => norm('signedInteger', '-1.5')).toThrow(/小数は受け付けません/);
  });

  it('数字でない値は弾く', () => {
    expect(() => norm('integer', '約1200')).toThrow(/数字として読めません/);
    expect(() => norm('integer', '１２３')).toThrow(/数字として読めません/);
    expect(() => norm('integer', true)).toThrow(/文字列か数値で指定してください/);
    expect(() => norm('integer', Number.NaN)).toThrow(/数値として読めません/);
  });

  it('桁区切りの中の空白は詰める', () => {
    expect(norm('integer', '1 234')).toBe('1,234');
    expect(norm('integer', '1　234')).toBe('1,234');
  });

  it('文字の欄は改行やタブを弾く', () => {
    expect(norm('text', ' 現金及び預金 ')).toBe('現金及び預金');
    expect(() => norm('text', '現金\n預金')).toThrow(/1行の欄です/);
  });

  it('備考は選択肢に完全一致するものだけ通す', () => {
    expect(norm('enum', '株式等', ['株式等', '土地等'])).toBe('株式等');
    expect(norm('enum', '', ['株式等', '土地等'])).toBe('');
    expect(() => norm('enum', '株式', ['株式等', '土地等'])).toThrow(/選択肢にありません/);
    expect(() => norm('enum', '株式等', [])).toThrow(/選べるのは なし/);
  });
});

describe('欄の引き当て', () => {
  it('小文字でも引ける', () => {
    expect(findField(catalog, 'g04').field).toBe('f28');
    expect(findField(catalog, ' G04 ').field).toBe('f28');
  });

  it('辞書に無いコードは describe_fields を案内して弾く', () => {
    expect(() => findField(catalog, 'G99')).toThrow(/describe_fields/);
  });
});

describe('欄への書き込み', () => {
  const data: CaseData = { table4: { f28: '1,000', other: 'そのまま' } };

  it('辞書の保存キーへ入れ、他の欄には触らない', () => {
    const { data: next } = applyFieldValues(catalog, data, [{ code: 'G04', value: 2500 }]);
    expect(next.table4?.f28).toBe('2,500');
    expect(next.table4?.other).toBe('そのまま');
  });

  it('元のデータは書き換えない', () => {
    applyFieldValues(catalog, data, [{ code: 'G04', value: 2500 }]);
    expect(data.table4?.f28).toBe('1,000');
  });

  it('変わったかどうかを差分に出す', () => {
    const { changes } = applyFieldValues(catalog, data, [
      { code: 'G04', value: '1,000' },
      { code: 'G10', value: -200 },
    ]);
    expect(changes[0]).toMatchObject({ code: 'G04', before: '1,000', after: '1,000', changed: false });
    expect(changes[1]).toMatchObject({ code: 'G10', before: '', after: '△200', changed: true });
    expect(changes[1]?.period).toBe('直前期');
  });

  it('同じ欄を2回指定したら弾く', () => {
    expect(() =>
      applyFieldValues(catalog, data, [
        { code: 'G04', value: 1 },
        { code: 'g04', value: 2 },
      ]),
    ).toThrow(/2回指定されています/);
  });

  it('1つでも通らなければ何も書かない', () => {
    expect(() =>
      applyFieldValues(catalog, data, [
        { code: 'G01', value: 5000 },
        { code: 'G04', value: 1.5 },
      ]),
    ).toThrow(/小数は受け付けません/);
    expect(data.table4?.['①']).toBeUndefined();
  });

  it('空の指定は弾く', () => {
    expect(() => applyFieldValues(catalog, data, [])).toThrow(/1つも指定されていません/);
  });
});

describe('現在値の読み出し', () => {
  it('辞書に載っている欄をすべて返す（未入力は空欄）', () => {
    const values = readFieldValues(catalog, { table4: { f28: '1,000' } });
    expect(values).toHaveLength(catalog.fields.length);
    expect(values.find((v) => v.code === 'G04')?.before).toBe('1,000');
    expect(values.find((v) => v.code === 'G10')?.before).toBe('');
  });
});
