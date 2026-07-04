import { useState, useCallback, useEffect, useMemo } from 'react';
import { type FormData, type TableId, initialFormData } from '@/types/form';

const STORAGE_KEY = 'stock-valuation-form-data';

const TREASURY_SHARE_FIELDS: ReadonlyArray<readonly [TableId, string]> = [
  ['table1_1', 'f63'],
  ['table3', '⑪'],
  ['table4', '③'],
  ['table6', '⑬'],
  ['table1_1', 'treasury_shares'],
];

const CAPITAL_AMOUNT_FIELDS: ReadonlyArray<readonly [TableId, string]> = [
  ['table4', '①'],
  ['table3', '⑨'],
  ['table6', '⑪'],
  ['table4', 'n52'],
];

const ISSUED_SHARE_FIELDS: ReadonlyArray<readonly [TableId, string]> = [
  ['table1_1', '⑤'],
  ['table3', '⑩'],
  ['table6', '⑫'],
  ['table4', '②'],
];

const CURRENT_DIVIDEND_FIELDS: ReadonlyArray<readonly [TableId, string]> = [
  ['table4', 'f28'],
  ['table3', 'f55'],
  ['table6', 'f61'],
];

const CURRENT_EXTRAORDINARY_DIVIDEND_FIELDS: ReadonlyArray<readonly [TableId, string]> = [
  ['table4', 'f29'],
  ['table3', 'f56'],
  ['table6', 'f62'],
];

const PREVIOUS_DIVIDEND_FIELDS: ReadonlyArray<readonly [TableId, string]> = [
  ['table4', 'f32'],
  ['table3', 'f59'],
  ['table6', 'f66'],
];

const PREVIOUS_EXTRAORDINARY_DIVIDEND_FIELDS: ReadonlyArray<readonly [TableId, string]> = [
  ['table4', 'f33'],
  ['table3', 'f60'],
  ['table6', 'f67'],
];

const LINKED_FIELD_GROUPS: ReadonlyArray<ReadonlyArray<readonly [TableId, string]>> = [
  TREASURY_SHARE_FIELDS,
  CAPITAL_AMOUNT_FIELDS,
  ISSUED_SHARE_FIELDS,
  CURRENT_DIVIDEND_FIELDS,
  CURRENT_EXTRAORDINARY_DIVIDEND_FIELDS,
  PREVIOUS_DIVIDEND_FIELDS,
  PREVIOUS_EXTRAORDINARY_DIVIDEND_FIELDS,
];

function linkedFieldGroup(table: TableId, field: string) {
  return LINKED_FIELD_GROUPS.find((group) =>
    group.some(([targetTable, targetField]) => targetTable === table && targetField === field),
  );
}

function normalizeLinkedFields(data: FormData): FormData {
  return LINKED_FIELD_GROUPS.reduce<FormData>((next, group) => {
    const value = group
      .map(([table, field]) => next[table]?.[field] ?? '')
      .find((candidate) => candidate !== '') ?? '';

    return group.reduce<FormData>((linked, [table, field]) => ({
      ...linked,
      [table]: { ...linked[table], [field]: value },
    }), next);
  }, data);
}

/** 旧様式（令和6年版）→令和8年様式の第1表の1のフィールド移行（①発行済株式→⑤、④議決権総数→⑥） */
function migrateTable1_1R8(data: FormData): FormData {
  const t = data.table1_1;
  if (!t || (t['①'] === undefined && t['④'] === undefined)) return data;
  const { ['①']: oldIssued, ['④']: oldTotalVotes, ...rest } = t;
  return {
    ...data,
    table1_1: {
      ...rest,
      ...(oldIssued && !rest['⑤'] ? { '⑤': oldIssued } : {}),
      ...(oldTotalVotes && !rest['⑥'] ? { '⑥': oldTotalVotes } : {}),
    },
  };
}

function normalizeFormData(data: FormData): FormData {
  const completeData = Object.keys(initialFormData).reduce<FormData>((next, table) => ({
    ...next,
    [table]: { ...initialFormData[table as TableId], ...(data[table as TableId] ?? {}) },
  }), initialFormData);

  return normalizeLinkedFields(migrateTable1_1R8(completeData));
}

function loadFromStorage(): FormData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return normalizeFormData(JSON.parse(saved) as FormData);
    }
  } catch {
    // ignore parse errors
  }
  return initialFormData;
}

export function useFormData() {
  const [formData, setFormData] = useState<FormData>(loadFromStorage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

  const updateField = useCallback(
    (table: TableId, field: string, value: string) => {
      setFormData((prev) => {
        const group = linkedFieldGroup(table, field);
        if (!group) {
          return {
            ...prev,
            [table]: { ...prev[table], [field]: value },
          };
        }

        return group.reduce<FormData>((next, [targetTable, targetField]) => ({
          ...next,
          [targetTable]: { ...next[targetTable], [targetField]: value },
        }), prev);
      });
    },
    [],
  );

  const getField = useCallback(
    (table: TableId, field: string): string => {
      return formData[table][field] ?? '';
    },
    [formData],
  );

  const resetAll = useCallback(() => {
    if (!window.confirm('全データをリセットしますか？この操作は取り消せません。')) return;
    setFormData(initialFormData);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(formData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-valuation-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [formData]);

  const importJson = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as FormData;
        setFormData(normalizeFormData(data));
      } catch {
        alert('ファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
  }, []);

  /** Table-scoped selector — stable reference per table while that table's data is unchanged */
  const tableData = useMemo(() => formData, [formData]);

  return { formData, tableData, updateField, getField, resetAll, exportJson, importJson };
}
