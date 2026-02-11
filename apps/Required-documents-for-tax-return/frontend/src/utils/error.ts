export function getErrorMessage(error: unknown, defaultMessage = 'エラーが発生しました'): string {
  return error instanceof Error ? error.message : defaultMessage;
}
