/**
 * IDを生成するユーティリティ関数
 * @param prefix IDのプレフィックス (例: "val", "user", "company")
 * @param length ランダム部分の長さ (デフォルト: 11)
 * @returns 生成されたID
 */
export function generateId(prefix: string, length: number = 11): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 2 + length);
  return `${prefix}_${timestamp}_${randomStr}`;
}

/**
 * フォームデータの基本情報バリデーション
 * @param data バリデーション対象のデータ
 * @returns バリデーション結果 { isValid: boolean, message?: string }
 */
export function validateBasicInfo(data: {
  fiscalYear?: string;
  companyName?: string;
  personInCharge?: string;
}): { isValid: boolean; message?: string } {
  if (!data.fiscalYear || !data.companyName || !data.personInCharge) {
    return {
      isValid: false,
      message: 'STEP0の基本情報を入力してください。',
    };
  }
  return { isValid: true };
}

/**
 * 共通のエラーハンドラー
 * @param error エラーオブジェクト
 * @param defaultMessage デフォルトのエラーメッセージ
 * @returns エラーメッセージ
 */
export function handleError(error: unknown, defaultMessage: string): string {
  if (error instanceof Error) {
    return error.message;
  }
  return defaultMessage;
}

/**
 * APIレスポンスのエラーチェック
 * @param response fetch APIのレスポンス
 * @returns レスポンスが正常かどうか
 */
export async function checkApiResponse(response: Response): Promise<void> {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'リクエストに失敗しました');
  }
}

/**
 * STEP1（会社規模）のバリデーション
 * @param data バリデーション対象のデータ
 * @returns バリデーション結果 { isValid: boolean, message?: string }
 */
export function validateStep1(data: {
  employees?: string;
  totalAssets?: string;
  sales?: string;
}): { isValid: boolean; message?: string } {
  if (!data.employees || !data.totalAssets || !data.sales) {
    return {
      isValid: false,
      message: 'STEP1の従業員数、総資産、売上高を選択してください。',
    };
  }
  return { isValid: true };
}

/**
 * STEP2（財務データ）のバリデーション
 * @param data バリデーション対象のデータ
 * @returns バリデーション結果 { isValid: boolean, message?: string }
 */
export function validateStep2(data: {
  currentPeriodNetAsset?: string;
  netAssetTaxValue?: string;
  currentPeriodProfit?: string;
}): { isValid: boolean; message?: string } {
  if (!data.currentPeriodNetAsset || !data.netAssetTaxValue || !data.currentPeriodProfit) {
    return {
      isValid: false,
      message: 'STEP2の直前期の純資産、相続税評価額による純資産、直前期の利益を入力してください。',
    };
  }
  return { isValid: true };
}

/**
 * STEP3（出資者情報）のバリデーション
 * @param investors 出資者リスト
 * @returns バリデーション結果 { isValid: boolean, message?: string, validInvestors?: Array }
 */
export function validateStep3(investors: Array<{ name?: string; amount?: number }>): {
  isValid: boolean;
  message?: string;
  validInvestors?: Array<{ name: string; amount: number }>;
} {
  const validInvestors = investors
    .filter((inv) => inv.name || inv.amount)
    .map((inv) => ({
      name: inv.name || '',
      amount: inv.amount || 0,
    }));

  if (validInvestors.length === 0) {
    return {
      isValid: false,
      message: 'STEP3の出資者情報を入力してください。',
    };
  }
  return { isValid: true, validInvestors };
}

/**
 * フォームデータ全体のバリデーション（各ステップのバリデーションを実行）
 * @param data バリデーション対象のデータ
 * @returns バリデーション結果 { isValid: boolean, message?: string, validInvestors?: Array }
 */
export function validateFormData(data: {
  fiscalYear?: string;
  companyName?: string;
  personInCharge?: string;
  employees?: string;
  totalAssets?: string;
  sales?: string;
  currentPeriodNetAsset?: string;
  netAssetTaxValue?: string;
  currentPeriodProfit?: string;
  investors: Array<{ name?: string; amount?: number }>;
}): {
  isValid: boolean;
  message?: string;
  validInvestors?: Array<{ name: string; amount: number }>;
} {
  // STEP0のバリデーション
  const basicValidation = validateBasicInfo({
    fiscalYear: data.fiscalYear,
    companyName: data.companyName,
    personInCharge: data.personInCharge,
  });
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  // STEP1のバリデーション
  const step1Validation = validateStep1({
    employees: data.employees,
    totalAssets: data.totalAssets,
    sales: data.sales,
  });
  if (!step1Validation.isValid) {
    return step1Validation;
  }

  // STEP2のバリデーション
  const step2Validation = validateStep2({
    currentPeriodNetAsset: data.currentPeriodNetAsset,
    netAssetTaxValue: data.netAssetTaxValue,
    currentPeriodProfit: data.currentPeriodProfit,
  });
  if (!step2Validation.isValid) {
    return step2Validation;
  }

  // STEP3のバリデーション
  const step3Validation = validateStep3(data.investors);
  if (!step3Validation.isValid) {
    return step3Validation;
  }

  return {
    isValid: true,
    validInvestors: step3Validation.validInvestors,
  };
}
