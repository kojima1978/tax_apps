import { describe, expect, it } from 'vitest';
import {
  PERSON_ATTRS, PERSON_FIELDS, candidateGroups, personActionPrefix, personAction, personFieldNames,
} from './person';
import { personColumn, type PersonCodes, type PersonY } from './geometry';

/** 突き合わせに使うだけの位置・コード（値そのものは結果に関係しない） */
const Y: PersonY = {
  head: [0, 1], furigana: [1, 2], name: [2, 3], myNumber: [3, 4], birthHead: [4, 5], birth: [5, 6],
  zip: [6, 7], address: [7, 8], tel: [8, 9], relation: [9, 10], cause: [10, 11], calcHead: [11, 12],
};
const CODES: PersonCodes = {
  furigana: 'E01', name: 'E02', ref: 'G74', myNumber: 'G02', birth: 'N01', age: 'G03',
  zip: 'P01', address: 'E03', tel: 'T01', relation: 'G04', job: 'E04', cause: ['G05', 'G06', 'G07'],
};

const cells = personColumn(0, Y, CODES, 'h0.', '1人目');

describe('人物ブロックと基本情報の画面', () => {
  it('用紙の欄と画面の欄が一致する（どちらかに足したら他方にも足す）', () => {
    const onPaper = cells.flatMap((cell) => (cell.field === undefined ? [] : [cell.field.slice('h0.'.length)]));
    expect([...onPaper].sort()).toEqual([...personFieldNames()].sort());
  });

  it('用紙側は入力できず、クリックでその人の画面が開く', () => {
    const inputs = cells.filter((cell) => cell.field !== undefined);
    expect(inputs.every((cell) => cell.readOnly === true)).toBe(true);
    expect(inputs.every((cell) => cell.action === personAction('h0.'))).toBe(true);
    // 見出しはキーボードでも開けるようにボタンにしてある（入力欄を持たないセル＝ボタン）
    expect(cells.some((cell) => cell.field === undefined && cell.action === personAction('h0.'))).toBe(true);
  });

  it('識別子から接頭辞を取り出せる（他の画面の識別子は拾わない）', () => {
    expect(personActionPrefix(personAction('h2.'))).toBe('h2.');
    expect(personActionPrefix('3')).toBeUndefined();
  });

  it('画面の欄に重複が無い', () => {
    const names = personFieldNames();
    expect(new Set(names).size).toBe(names.length);
    const all = [...PERSON_FIELDS, ...PERSON_ATTRS].map((field) => field.field);
    expect(new Set(all).size).toBe(all.length);
  });

  it('属性は用紙に出ない（他の表のためだけに持つ）', () => {
    const onPaper = new Set(personFieldNames());
    for (const attr of PERSON_ATTRS) expect(onPaper.has(attr.field)).toBe(false);
  });
});

describe('氏名欄の候補分け', () => {
  const people = [
    { value: '1', label: '甲' },
    { value: '2', label: '乙' },
    { value: '3', label: '丙' },
  ];

  it('先に当てはまった区分に入り、残りは「その他」になる', () => {
    const groups = candidateGroups(people, [
      { label: '候補（一般障害者）', match: (i) => i === 0 },
      { label: '候補（特別障害者）', match: (i) => i <= 1 },
    ]);
    expect(groups).toEqual([
      { label: '候補（一般障害者）', options: [people[0]] },
      { label: '候補（特別障害者）', options: [people[1]] },
      { label: 'その他', options: [people[2]] },
    ]);
  });

  it('空の区分は出さない（候補が居なければ全員が「その他」）', () => {
    const groups = candidateGroups(people, [{ label: '候補', match: () => false }]);
    expect(groups).toEqual([{ label: 'その他', options: people }]);
  });
});
