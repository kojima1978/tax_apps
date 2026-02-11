export function getErrorMessage(error: unknown, defaultMessage = 'エラーが発生しました'): string {
  return error instanceof Error ? error.message : defaultMessage;
}

export function translateCustomerError(error: unknown, defaultMsg: string): string {
  const message = getErrorMessage(error, defaultMsg);
  if (message.includes('already exists')) {
    return 'この担当者に同名のお客様が既に登録されています';
  }
  return message;
}
