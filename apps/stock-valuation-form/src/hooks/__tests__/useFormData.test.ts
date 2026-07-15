import { describe, expect, it } from 'vitest';
import { initialFormData, type FormData, type TableId } from '@/types/form';
import { normalizeFormData, updateFormField } from '../useFormData';

const COMPANY_FIELDS: ReadonlyArray<readonly [TableId, string]> = [
  ['table1_1', 'f12'],
  ['table1_2', 'company'],
  ['table2', 'company'],
  ['table3', 'company'],
  ['table4', 'company'],
  ['table4_1', 'company'],
  ['table4_2', 'company'],
  ['table5', 'company'],
  ['table6', 'company'],
  ['table7', 'company'],
  ['table7_1', 'company'],
  ['table7_2', 'company'],
  ['table7_3', 'company'],
  ['table8', 'company'],
];

const formDataWith = (table: TableId, field: string, value: string): FormData => ({
  ...initialFormData,
  [table]: { [field]: value },
});

describe('normalizeFormData company name linkage', () => {
  it('updates every table when table 1-1 company name changes', () => {
    const updated = updateFormField(initialFormData, 'table1_1', 'f12', '連動テスト株式会社');

    for (const [table, field] of COMPANY_FIELDS) {
      expect(updated[table][field]).toBe('連動テスト株式会社');
    }
  });

  it('copies the company name from table 1-1 to every table', () => {
    const normalized = normalizeFormData(formDataWith('table1_1', 'f12', '株式会社テスト'));

    for (const [table, field] of COMPANY_FIELDS) {
      expect(normalized[table][field]).toBe('株式会社テスト');
    }
  });

  it('migrates a company name stored by an older form into the shared fields', () => {
    const normalized = normalizeFormData(formDataWith('table2', 'company', '旧データ株式会社'));

    expect(normalized.table1_1.f12).toBe('旧データ株式会社');
    expect(normalized.table7.company).toBe('旧データ株式会社');
    expect(normalized.table8.company).toBe('旧データ株式会社');
  });
});

describe('table 1-2 minority shareholder judgment', () => {
  it('clears ㋬ and ㋣ when ㋭ determines the standard valuation method', () => {
    const data: FormData = {
      ...initialFormData,
      table1_2: { j_yakuin: 'no', j_chushin_self: 'no', j_chushin_other: 'yes' },
    };
    const updated = updateFormField(data, 'table1_2', 'j_yakuin', 'yes');

    expect(updated.table1_2).toMatchObject({
      j_yakuin: 'yes',
      j_chushin_self: '',
      j_chushin_other: '',
    });
  });

  it('clears ㋣ when ㋬ determines the standard valuation method', () => {
    const data: FormData = {
      ...initialFormData,
      table1_2: { j_yakuin: 'no', j_chushin_self: 'no', j_chushin_other: 'yes' },
    };
    const updated = updateFormField(data, 'table1_2', 'j_chushin_self', 'yes');

    expect(updated.table1_2).toMatchObject({
      j_yakuin: 'no',
      j_chushin_self: 'yes',
      j_chushin_other: '',
    });
  });
});

describe('table 1-1 industry linkage', () => {
  it('fills the industry name when an industry number is selected', () => {
    const updated = updateFormField(initialFormData, 'table1_1', 'f23', '3');

    expect(updated.table1_1.f23).toBe('3');
    expect(updated.table1_1.f22).toBe('建築工事業（木造建築工事業を除く）');
  });

  it('fills the large-category name even when its content is blank', () => {
    const updated = updateFormField(initialFormData, 'table1_1', 'f23', '1');

    expect(updated.table1_1.f22).toBe('建設業');
  });

  it('updates and clears the linked description together with the industry number', () => {
    const selected = updateFormField(initialFormData, 'table1_1', 'f26', '54');
    const cleared = updateFormField(selected, 'table1_1', 'f26', '');

    expect(selected.table1_1.f25).toBe('ソフトウェア業');
    expect(cleared.table1_1.f26).toBe('');
    expect(cleared.table1_1.f25).toBe('');
  });

  it('repairs stale linked content while importing saved JSON', () => {
    const normalized = normalizeFormData({
      ...initialFormData,
      table1_1: { f29: '115', f28: '古い内容' },
    });

    expect(normalized.table1_1.f28).toBe('その他の産業');
  });
});

describe('table 4-2 similar industry linkage', () => {
  it('fills the industry name, B/C/D and published prices when its number is selected', () => {
    const dated = updateFormField(initialFormData, 'table1_1', 'f14_m', '4');
    const updated = updateFormField(dated, 'table4', 'r1gyonum', '3');

    expect(updated.table4.r1gyonum).toBe('3');
    expect(updated.table4.r1gyo).toBe('【小】建築工事業（木造建築工事業を除く）');
    expect(updated.table4).toMatchObject({
      r1sB1: '21',
      r1sB2: '10',
      r1sC: '128',
      r1sD: '780',
      '㋷': '916',
      '㋦': '952',
      '㋸': '979',
      '㋾': '753',
      '㋻': '751',
    });
  });

  it('refreshes both blocks when the tax month changes', () => {
    const first = updateFormField(initialFormData, 'table4', 'r1gyonum', '1');
    const both = updateFormField(first, 'table4', 'r2gyonum', '2');
    const updated = updateFormField(both, 'table1_1', 'f14_m', '1');

    expect(updated.table4).toMatchObject({
      '㋷': '756', '㋦': '708', '㋸': '681',
      '㋕': '682', '㋵': '650', '㋟': '626',
    });
  });

  it('repairs the similar industry name while importing saved JSON', () => {
    const normalized = normalizeFormData({
      ...initialFormData,
      table4: { r2gyonum: '2', r2gyo: '古い名称' },
    });

    expect(normalized.table4.r2gyo).toBe('【中】総合工事業');
    expect(normalized.table4).toMatchObject({
      r2sB1: '14', r2sB2: '60', r2sC: '71', r2sD: '600', '㋹': '543',
    });
  });
});
