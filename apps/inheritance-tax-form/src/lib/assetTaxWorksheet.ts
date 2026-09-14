export interface AssetTaxSource {
  id: string;
  category: string;
  description: string;
  personIndex: number;
  amount: number;
}

export interface AssetTaxPersonSource {
  name: string;
  declaredAssets: number;
  otherTaxBase: number;
  debtAndFuneral: number;
  taxablePrice: number;
  taxBurden: number;
  payable: number;
}

export interface AssetTaxRow extends AssetTaxSource {
  synthetic?: boolean;
  allocatedTax: number;
  allocatedPayable: number;
}

export interface AssetTaxPersonSummary extends AssetTaxPersonSource {
  index: number;
  detailedAssets: number;
  allocationBase: number;
  variance: number;
}

export interface AssetTaxWorksheetData {
  rows: AssetTaxRow[];
  people: AssetTaxPersonSummary[];
}

/**
 * 人ごとの税額を、その人が取得した正の財産価額で按分する。
 * 端数は最大剰余法で配り、資産別税額の合計を第1表⑲・㉑に必ず一致させる。
 */
function allocate(total: number, amounts: readonly number[]): number[] {
  const target = Math.max(0, Math.trunc(total));
  const denominator = amounts.reduce((sum, amount) => sum + Math.max(0, amount), 0);
  if (target === 0 || denominator === 0) return amounts.map(() => 0);

  const exact = amounts.map((amount) => (target * Math.max(0, amount)) / denominator);
  const result = exact.map(Math.floor);
  const remainder = target - result.reduce((sum, amount) => sum + amount, 0);
  const order = exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let i = 0; i < remainder; i += 1) result[order[i % order.length]!.index]! += 1;
  return result;
}

export function buildAssetTaxWorksheet(
  assets: readonly AssetTaxSource[],
  people: readonly AssetTaxPersonSource[],
): AssetTaxWorksheetData {
  const rows: AssetTaxRow[] = [];
  const summaries: AssetTaxPersonSummary[] = [];

  people.forEach((person, personIndex) => {
    const detailed = assets.filter((asset) => asset.personIndex === personIndex && asset.amount > 0);
    const detailedAssets = detailed.reduce((sum, asset) => sum + asset.amount, 0);
    const variance = person.declaredAssets - detailedAssets;
    const sources: AssetTaxSource[] = [...detailed];

    if (variance > 0) {
      sources.push({
        id: `difference-${personIndex}`,
        category: '第11表',
        description: '付表明細との差額・未入力明細',
        personIndex,
        amount: variance,
      });
    }
    if (person.otherTaxBase > 0) {
      sources.push({
        id: `other-${personIndex}`,
        category: 'その他',
        description: '相続時精算課税・暦年課税等（第1表②・⑤）',
        personIndex,
        amount: person.otherTaxBase,
      });
    }
    if (sources.length === 0 && person.taxBurden > 0) {
      sources.push({
        id: `fallback-${personIndex}`,
        category: 'その他',
        description: '資産明細に対応しない課税価格',
        personIndex,
        amount: Math.max(1, person.taxablePrice),
      });
    }

    const amounts = sources.map((source) => source.amount);
    const allocatedTax = allocate(person.taxBurden, amounts);
    const allocatedPayable = allocate(person.payable, amounts);
    const allocationBase = amounts.reduce((sum, amount) => sum + amount, 0);
    sources.forEach((source, index) => rows.push({
      ...source,
      synthetic: source.id.startsWith('difference-') || source.id.startsWith('other-') || source.id.startsWith('fallback-'),
      allocatedTax: allocatedTax[index] ?? 0,
      allocatedPayable: allocatedPayable[index] ?? 0,
    }));

    summaries.push({ ...person, index: personIndex, detailedAssets, allocationBase, variance });
  });

  return { rows, people: summaries };
}
