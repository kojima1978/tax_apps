import { useState, useCallback, useEffect, useMemo } from 'react';
import { type FormData, type TableId, initialFormData } from '@/types/form';

const STORAGE_KEY = 'stock-valuation-form-data';

function loadFromStorage(): FormData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as FormData;
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
      setFormData((prev) => ({
        ...prev,
        [table]: { ...prev[table], [field]: value },
      }));
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
        setFormData(data);
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
