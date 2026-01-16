import { useRouter } from 'next/navigation';

/**
 * localStorageのformDataを更新してSTEP0に戻る共通処理
 */
export function handleDoubleClickToStep0(
  fieldName: 'companyName' | 'personInCharge',
  value: string,
  router: ReturnType<typeof useRouter>
) {
  const savedData = localStorage.getItem('formData');
  if (savedData) {
    const formData = JSON.parse(savedData);
    formData[fieldName] = value;
    localStorage.setItem('formData', JSON.stringify(formData));
  } else {
    const formData = {
      [fieldName]: value,
      fiscalYear: '',
      companyName: fieldName === 'personInCharge' ? '' : value,
      personInCharge: fieldName === 'companyName' ? '' : value,
    };
    localStorage.setItem('formData', JSON.stringify(formData));
  }
  router.push('/');
}

/**
 * フォーム送信の共通処理
 */
export async function handleFormSubmit<T>(
  endpoint: string,
  method: 'POST' | 'PUT',
  data: T
): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || '保存に失敗しました');
    }

    return { success: true, message: result.message || '保存しました' };
  } catch (error) {
    console.error('保存エラー:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '保存に失敗しました',
    };
  }
}
