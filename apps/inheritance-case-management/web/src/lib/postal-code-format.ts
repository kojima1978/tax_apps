/** 全角数字 → 半角数字 + 数字以外を除去（最大 7 桁） */
export function normalizePostalCodeDigits(value: string | null | undefined): string {
  if (!value) return ""
  const halfWidth = value.replace(/[０-９]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  )
  return halfWidth.replace(/[^\d]/g, "").slice(0, 7)
}

/** 入力中表示用: 4 桁目以降にハイフンを挿入（"123" → "123", "1234" → "123-4", "1234567" → "123-4567"） */
export function formatPostalCodeForInput(value: string | null | undefined): string {
  const digits = normalizePostalCodeDigits(value)
  if (digits.length <= 3) return digits
  return `${digits.slice(0, 3)}-${digits.slice(3)}`
}

/** 表示用: 7 桁完備なら "〒XXX-XXXX"、不完全なら入力中フォーマット、空なら空文字 */
export function formatPostalCodeForDisplay(value: string | null | undefined): string {
  const digits = normalizePostalCodeDigits(value)
  if (digits.length === 0) return ""
  if (digits.length === 7) return `〒${digits.slice(0, 3)}-${digits.slice(3)}`
  return `〒${formatPostalCodeForInput(digits)}`
}

/** 7 桁の有効な郵便番号か（保存時バリデーション用） */
export function isValidPostalCode(value: string | null | undefined): boolean {
  if (!value) return true
  return /^\d{7}$/.test(value)
}
