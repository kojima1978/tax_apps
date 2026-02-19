export function parseNumericInput(value: string): number {
  return Number(value.replace(/,/g, ''));
}
