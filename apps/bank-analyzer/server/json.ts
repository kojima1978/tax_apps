// id は Django の BigAutoField（PostgreSQL の bigint）なので Prisma では BigInt で届く。
// BigInt は JSON.stringify できない（TypeError）ため、API から出す前に数値へ直す。
//
// 実データの id は数千程度で、Number の安全な範囲（2^53 - 1）を超えることは現実には無い。
// 超えたときに黙って丸めると別の行を指す id になるので、その場合は落とす。
export function toId(value: bigint): number {
  const n = Number(value);
  if (!Number.isSafeInteger(n)) {
    throw new RangeError(`id が数値で表せる範囲を超えています: ${value.toString()}`);
  }
  return n;
}

// 画面から届いた id（文字列・数値）を BigInt に直す。正の整数でなければ null。
export function parseId(value: unknown): bigint | null {
  const text = typeof value === 'number' ? String(value) : value;
  if (typeof text !== 'string' || !/^[1-9]\d{0,17}$/.test(text)) return null;
  return BigInt(text);
}

// DATE 列（時刻を持たない）を 'YYYY-MM-DD' で出す。Prisma は UTC の 0時として返すので
// ローカル時刻へ直すと日付がずれる（Asia/Tokyo なら同じ日の 9時で済むが、
// TZ に依存させない）。
export function toDateString(value: Date | null): string | null {
  return value === null ? null : value.toISOString().slice(0, 10);
}
