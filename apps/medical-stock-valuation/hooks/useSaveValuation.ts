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
   * 共通の保存処理
   * @param formData 保存するフォームデータ
   * @param forceNewId trueの場合は常に新しいIDを生成
   */
  const saveInternal = async (formData: FormData, forceNewId: boolean): Promise<{ success: boolean; id?: string }> => {
    setIsSaving(true);
    setError(null);

    try {
      let dataToSave: FormData;

      if (forceNewId || !formData.id) {
        const newId = generateId('val');
        dataToSave = { ...formData, id: newId };
      } else {
        dataToSave = { ...formData };
      }

      const response = await fetch('/medical/api/valuations/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });

      await checkApiResponse(response);

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

  const saveAsNew = (formData: FormData) => saveInternal(formData, true);
  const saveOverwrite = (formData: FormData) => saveInternal(formData, false);

  return { saveAsNew, saveOverwrite, isSaving, error };
}
