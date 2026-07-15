import { useState, useCallback, useEffect, useMemo } from 'react';
import { type FormData, type TableId, initialFormData } from '@/types/form';
import { industryCategoryOf, similarIndustryDisplayNameOf } from '@/data/industryCategories';
import { similarIndustryMetricValues } from '@/data/industryValuationMetrics';
import { rolloverFormData } from './rollover';

const STORAGE_KEY = 'stock-valuation-form-data';

const INDUSTRY_FIELD_LINKS: Readonly<Record<string, string>> = {
  f23: 'f22',
  f26: 'f25',
  f29: 'f28',
};

const SIMILAR_INDUSTRY_BLOCKS = {
  r1gyonum: {
    name: 'r1gyo', bYen: 'r1sB1', bSen: 'r1sB2', c: 'r1sC', d: 'r1sD',
    currentPrice: '㋷', previousPrice: '㋦', twoMonthsPreviousPrice: '㋸',
    previousYearAverage: '㋾', twoYearAverage: '㋻',
  },
  r2gyonum: {
    name: 'r2gyo', bYen: 'r2sB1', bSen: 'r2sB2', c: 'r2sC', d: 'r2sD',
    currentPrice: '㋕', previousPrice: '㋵', twoMonthsPreviousPrice: '㋟',
    previousYearAverage: '㋹', twoYearAverage: '㋞',
  },
};

type SimilarIndustryNumberField = keyof typeof SIMILAR_INDUSTRY_BLOCKS;

function linkSimilarIndustryBlock(
  table: Record<string, string>,
  numberField: SimilarIndustryNumberField,
  taxMonth: string,
): Record<string, string> {
  const block = SIMILAR_INDUSTRY_BLOCKS[numberField];
  const number = table[numberField] ?? '';
  const metrics = similarIndustryMetricValues(number, taxMonth);

  return {
    ...table,
    [block.name]: similarIndustryDisplayNameOf(number),
    [block.bYen]: metrics.bYen,
    [block.bSen]: metrics.bSen,
    [block.c]: metrics.c,
    [block.d]: metrics.d,
    [block.currentPrice]: metrics.currentPrice,
    [block.previousPrice]: metrics.previousPrice,
    [block.twoMonthsPreviousPrice]: metrics.twoMonthsPreviousPrice,
    [block.previousYearAverage]: metrics.previousYearAverage,
    [block.twoYearAverage]: metrics.twoYearAverage,
  };
}

function linkAllSimilarIndustryBlocks(
  table: Record<string, string>,
  taxMonth: string,
): Record<string, string> {
  return (Object.keys(SIMILAR_INDUSTRY_BLOCKS) as SimilarIndustryNumberField[])
    .reduce((linked, numberField) => (
      linkSimilarIndustryBlock(linked, numberField, taxMonth)
    ), table);
}

const COMPANY_NAME_FIELDS: ReadonlyArray<readonly [TableId, string]> = [
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

const TREASURY_SHARE_FIELDS: ReadonlyArray<readonly [TableId, string]> = [
  ['table1_1', 'f63'],
  ['table3', '⑮'],
  ['table4', '③'],
  ['table6', '⑬'],
  ['table1_1', 'treasury_shares'],
];

const CAPITAL_AMOUNT_FIELDS: ReadonlyArray<readonly [TableId, string]> = [
  ['table4', '①'],
  ['table3', '⑬'],
  ['table6', '⑪'],
  ['table4', 'n52'],
];

const ISSUED_SHARE_FIELDS: ReadonlyArray<readonly [TableId, string]> = [
  ['table1_1', '⑤'],
  ['table3', '⑭'],
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
  COMPANY_NAME_FIELDS,
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

export function updateFormField(data: FormData, table: TableId, field: string, value: string): FormData {
  if (table === 'table1_2' && field === 'j_yakuin') {
    return {
      ...data,
      table1_2: {
        ...data.table1_2,
        [field]: value,
        ...(value === 'yes' ? { j_chushin_self: '', j_chushin_other: '' } : {}),
      },
    };
  }

  if (table === 'table1_2' && field === 'j_chushin_self') {
    return {
      ...data,
      table1_2: {
        ...data.table1_2,
        [field]: value,
        ...(value === 'yes' ? { j_chushin_other: '' } : {}),
      },
    };
  }

  const linkedIndustryField = table === 'table1_1' ? INDUSTRY_FIELD_LINKS[field] : undefined;
  if (linkedIndustryField) {
    return {
      ...data,
      table1_1: {
        ...data.table1_1,
        [field]: value,
        [linkedIndustryField]: industryCategoryOf(value)?.名前 ?? '',
      },
    };
  }

  if (table === 'table4' && field in SIMILAR_INDUSTRY_BLOCKS) {
    const numberField = field as SimilarIndustryNumberField;
    const changedTable = { ...data.table4, [field]: value };
    return {
      ...data,
      table4: linkSimilarIndustryBlock(
        changedTable,
        numberField,
        data.table1_1.f14_m ?? '',
      ),
    };
  }

  if (table === 'table1_1' && field === 'f14_m') {
    return {
      ...data,
      table1_1: { ...data.table1_1, [field]: value },
      table4: linkAllSimilarIndustryBlocks(data.table4, value),
    };
  }

  const group = linkedFieldGroup(table, field);
  if (!group) {
    return {
      ...data,
      [table]: { ...data[table], [field]: value },
    };
  }

  return group.reduce<FormData>((next, [targetTable, targetField]) => ({
    ...next,
    [targetTable]: { ...next[targetTable], [targetField]: value },
  }), data);
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

function normalizeIndustryFields(data: FormData): FormData {
  const normalizedTable = Object.entries(INDUSTRY_FIELD_LINKS).reduce<Record<string, string>>(
    (table, [numberField, contentField]) => {
      const number = table[numberField] ?? '';
      return {
        ...table,
        [contentField]: industryCategoryOf(number)?.名前 ?? '',
      };
    },
    data.table1_1,
  );

  const normalizedTable4 = linkAllSimilarIndustryBlocks(
    data.table4,
    data.table1_1.f14_m ?? '',
  );

  return { ...data, table1_1: normalizedTable, table4: normalizedTable4 };
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

export function normalizeFormData(data: FormData): FormData {
  const completeData = Object.keys(initialFormData).reduce<FormData>((next, table) => ({
    ...next,
    [table]: { ...initialFormData[table as TableId], ...(data[table as TableId] ?? {}) },
  }), initialFormData);

  return normalizeIndustryFields(normalizeLinkedFields(migrateTable1_1R8(completeData)));
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
      setFormData((prev) => updateFormField(prev, table, field, value));
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

  /** 翌事業年度更新（実行前に現在データをJSONで自動バックアップ） */
  const rolloverToNextYear = useCallback(() => {
    const message = [
      '翌事業年度への更新を行います。',
      '',
      '・課税時期・直前期（自/至）の年を1年進めます',
      '・直前期の数値を直前々期へ順送りし、直前期欄を空欄にします',
      '　（第４表の配当/利益/純資産、第７表の受取配当金等）',
      '・第５表の金額、会社規模判定の数値、価額修正・株式に関する権利、',
      '　類似業種の株価をクリアします（業種目番号・科目は維持）',
      '・会社名・株主構成などの基本情報は維持します',
      '',
      '実行前に現在のデータをJSONファイルとして自動保存します。よろしいですか？',
    ].join('\n');
    if (!window.confirm(message)) return;
    exportJson();
    setFormData((prev) => normalizeFormData(rolloverFormData(prev)));
  }, [exportJson]);

  /** Table-scoped selector — stable reference per table while that table's data is unchanged */
  const tableData = useMemo(() => formData, [formData]);

  return { formData, tableData, updateField, getField, resetAll, exportJson, importJson, rolloverToNextYear };
}
