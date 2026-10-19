import { calcTable2 } from '@/components/tables/table2/Table2Grid';
import { calcTable3 } from '@/components/tables/table3/Table3Grid';
import { calcTable6 } from '@/components/tables/table6/calcTable6';
import { withPurpose, type ValuationBasisKey } from '@/lib/valuationReport';
import type { TableProps } from '@/types/form';

/**
 * 比準0・1から一般会社への移行を仮定した「算定方法のみ」の比較。
 * 回復後の配当・利益・純資産を推定せず、第4・5表の要素を据え置く。
 * 両欄は修正前の価額で揃え、使われていない第3表の保存済み修正を混入させない。
 */
export function calcGeneralCompanySimulation(getField: TableProps['getField'], key: ValuationBasisKey) {
  const gf = withPurpose(getField, key);
  const t2 = calcTable2(gf);
  const zero = t2.j.s4b === true;
  if (!zero && t2.j.s1 !== true) return null;

  const t3 = calcTable3(gf);
  const t6 = calcTable6(gf);
  const blockers: string[] = [];
  if (t2.j.s2 === true) blockers.push('株式等保有特定会社');
  if (t2.j.s3 === true) blockers.push('土地保有特定会社');
  if (t2.j.s4a === true) blockers.push('開業後3年未満');
  if (t2.j.s5a) blockers.push('開業前');
  if (t2.j.s5b) blockers.push('休業中');
  if (t2.j.s6) blockers.push('清算中');
  const pending: string[] = [];
  if (t2.j.s2 === null) pending.push('株式等保有割合');
  if (t2.j.s3 === null) pending.push('土地保有割合');
  if (t2.j.s4a === null) pending.push('開業年月日');
  const comparable = t3.v1;
  const netAsset = t6.iValue;
  // 小会社の純資産へのフォールバック等は比較に使わず、両方式の入力が揃った場合のみ比較する。
  const ready = comparable !== null && netAsset !== null && t3.size !== null;
  const currentPrice = ready && blockers.length === 0 ? zero ? t6.p7 : t6.p4 : null;
  const generalPrice = ready ? t3.base : null;
  const diff = currentPrice !== null && generalPrice !== null ? generalPrice - currentPrice : null;
  return {
    key,
    source: zero ? '比準要素数0の会社' : '比準要素数1の会社',
    currentPrice,
    generalPrice,
    comparable,
    netAsset,
    size: t3.size,
    lRate: t3.lRate,
    diff,
    diffRate: diff !== null && currentPrice !== null && currentPrice > 0 ? diff / currentPrice * 100 : null,
    blockers,
    pending,
  };
}
