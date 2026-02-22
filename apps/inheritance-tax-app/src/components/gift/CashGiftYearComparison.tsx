import { useMemo } from 'react';
import TrendingUp from 'lucide-react/icons/trending-up';
import { SectionHeader } from '../SectionHeader';
import type { HeirComposition, SpouseAcquisitionMode, GiftRecipient } from '../../types';
import { optimizeGiftAmounts, calculateCashGiftSimulation, formatCurrency, formatDelta } from '../../utils';
import { TH, TD } from '../tableStyles';

interface CashGiftYearComparisonProps {
  estateValue: number;
  composition: HeirComposition;
  recipients: GiftRecipient[];
  spouseMode: SpouseAcquisitionMode;
}

const YEAR_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type YearComparisonRow = {
  years: number;
  annualAmount: number;
  totalGifts: number;
  totalGiftTax: number;
  inheritanceTax: number;
  totalTaxBurden: number;
  netProceeds: number;
  netDiff: number;
};

export const CashGiftYearComparison: React.FC<CashGiftYearComparisonProps> = ({
  estateValue,
  composition,
  recipients,
  spouseMode,
}) => {
  const rows = useMemo((): YearComparisonRow[] => {
    if (recipients.length === 0 || estateValue <= 0) return [];

    return YEAR_OPTIONS.map(years => {
      const testRecipients = recipients.map(r => ({ ...r, years, annualAmount: 0 }));
      const optimized = optimizeGiftAmounts(estateValue, composition, testRecipients, spouseMode);
      const sim = calculateCashGiftSimulation(estateValue, composition, optimized, spouseMode);

      return {
        years,
        annualAmount: optimized[0]?.annualAmount ?? 0,
        totalGifts: sim.totalGifts,
        totalGiftTax: sim.totalGiftTax,
        inheritanceTax: sim.proposed.taxResult.totalFinalTax,
        totalTaxBurden: sim.proposed.taxResult.totalFinalTax + sim.totalGiftTax,
        netProceeds: sim.proposed.totalNetProceeds,
        netDiff: sim.netProceedsDiff,
      };
    });
  }, [estateValue, composition, recipients, spouseMode]);

  if (rows.length === 0) return null;

  const bestIdx = rows.reduce((best, row, i) =>
    row.netProceeds > rows[best].netProceeds ? i : best, 0,
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <SectionHeader icon={TrendingUp} title="年数別 最適贈与比較" />
      <p className="text-sm text-gray-500 mb-4">
        受取人{recipients.length}人 × 各贈与年数での最適な年間贈与額と手取りの比較
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-green-600 text-white">
              <th className={TH}>贈与年数</th>
              <th className={TH}>最適年間贈与額/人</th>
              <th className={TH}>総贈与額</th>
              <th className={TH}>贈与税合計</th>
              <th className={TH}>相続税</th>
              <th className={TH}>税負担合計</th>
              <th className={TH}>手取り合計</th>
              <th className={TH}>手取り増減</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.years} className={i === bestIdx ? 'bg-green-50 font-semibold' : 'hover:bg-gray-50'}>
                <td className={`${TD} text-center`}>{row.years}年</td>
                <td className={TD}>{formatCurrency(row.annualAmount)}</td>
                <td className={TD}>{formatCurrency(row.totalGifts)}</td>
                <td className={TD}>{row.totalGiftTax > 0 ? formatCurrency(row.totalGiftTax) : '—'}</td>
                <td className={TD}>{formatCurrency(row.inheritanceTax)}</td>
                <td className={TD}>{formatCurrency(row.totalTaxBurden)}</td>
                <td className={`${TD} font-bold`}>{formatCurrency(row.netProceeds)}</td>
                <td className={`${TD} font-medium ${row.netDiff > 0 ? 'text-green-700' : row.netDiff < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                  {row.netDiff !== 0 ? formatDelta(row.netDiff) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows[bestIdx] && rows[bestIdx].netDiff > 0 && (
        <p className="mt-3 text-sm text-green-700 font-medium">
          {rows[bestIdx].years}年贈与が最も手取りが増加します（+{formatCurrency(rows[bestIdx].netDiff)}）
        </p>
      )}
    </div>
  );
};
