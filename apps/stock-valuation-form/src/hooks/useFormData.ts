import { useState, useCallback, useEffect } from 'react';
import { type FormData, type TableId, initialFormData } from '@/types/form';

const STORAGE_KEY = 'stock-valuation-form-data';

function loadFromStorage(): FormData {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
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
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
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
    setFormData(initialFormData);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  return { formData, updateField, getField, resetAll };
}
