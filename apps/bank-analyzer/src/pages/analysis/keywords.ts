// パターン登録の候補キーワード（Django: utils.js の extractMultipleKeywords）。
// 摘要を区切り記号で割った断片・先頭2つの連結・短い摘要そのもの・カタカナ連・英数字連を集め、
// 5文字に近い順に最大6つ。先頭が「おすすめ」になる

const SEPARATORS = /[\s　・／/\-－―]+/;

export function keywordCandidates(description: string): string[] {
  if (!description) return [];
  const candidates = new Set<string>();
  const parts = description.split(SEPARATORS).filter((p) => p.length > 0);
  for (const p of parts) if (p.length >= 2) candidates.add(p);
  const [first, second] = parts;
  if (first && second) candidates.add(first + second);
  if (description.length >= 2 && description.length <= 15) candidates.add(description);
  for (const k of description.match(/[ァ-ヶー]+/g) ?? []) if (k.length >= 2) candidates.add(k);
  for (const a of description.match(/[A-Za-z0-9]+/g) ?? []) if (a.length >= 2) candidates.add(a);
  // sort は安定なので、同じ距離なら見つけた順
  return [...candidates]
    .filter((c) => c.length >= 2 && c.length <= 20)
    .sort((a, b) => Math.abs(a.length - 5) - Math.abs(b.length - 5))
    .slice(0, 6);
}
