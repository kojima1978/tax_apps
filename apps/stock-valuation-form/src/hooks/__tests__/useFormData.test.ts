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
