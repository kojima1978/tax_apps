import { useState } from 'react';
import { FormData } from '@/lib/types';
import { generateId, checkApiResponse } from '@/lib/utils';

/**
 * 評価データを保存するカスタムフック
 */
export function useSaveValuation() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 新規保存 - 常に新しいIDを生成して保存
   */
  const saveAsNew = async (formData: FormData): Promise<{ success: boolean; id?: string }> => {
    setIsSaving(true);
    setError(null);

    try {
      // 新しいIDを生成
      const newId = generateId('val');
      const dataToSave = {
        ...formData,
        id: newId,
      };

      const response = await fetch('/api/valuations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });

      await checkApiResponse(response);

      // localStorageも更新
      localStorage.setItem('formData', JSON.stringify(dataToSave));

      return { success: true, id: newId };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'データの保存に失敗しました';
      setError(errorMessage);
      return { success: false };
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 上書保存 - 既存のIDがあればそれを使用、なければ新規保存
   */
  const saveOverwrite = async (formData: FormData): Promise<{ success: boolean; id?: string }> => {
    setIsSaving(true);
    setError(null);

    try {
      let dataToSave: FormData;

      if (formData.id) {
        // 既存IDがある場合は上書き
        dataToSave = { ...formData };
      } else {
        // IDがない場合は新規として扱う
        const newId = generateId('val');
        dataToSave = {
          ...formData,
          id: newId,
        };
      }

      const response = await fetch('/api/valuations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });

      await checkApiResponse(response);

      // localStorageも更新
      localStorage.setItem('formData', JSON.stringify(dataToSave));

      return { success: true, id: dataToSave.id };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'データの保存に失敗しました';
      setError(errorMessage);
      return { success: false };
    } finally {
      setIsSaving(false);
    }
  };

  return { saveAsNew, saveOverwrite, isSaving, error };
}
