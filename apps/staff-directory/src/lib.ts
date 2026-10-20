// 検索語をサーバの保存形式（フリガナはカタカナ）に寄せる
export function normalizeQuery(q: string): string {
  return q
    .normalize('NFKC')
    .trim()
    .replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60))
    .toLowerCase();
}
