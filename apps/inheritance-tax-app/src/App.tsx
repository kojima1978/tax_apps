import { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { HeirSettings } from './components/HeirSettings';
import { RangeSettings } from './components/RangeSettings';
import { TaxTable } from './components/TaxTable';
import { ExcelExport } from './components/ExcelExport';
import { PrintButton } from './components/PrintButton';
import type { HeirComposition, TaxCalculationResult } from './types';
import { calculateInheritanceTax } from './hooks/useTaxCalculator';

function App() {
  // 相続人の構成
  const [composition, setComposition] = useState<HeirComposition>({
    hasSpouse: true,
    selectedRank: 'rank1',
    rank1Children: [
      {
        id: '1',
        type: 'child',
        isDeceased: false,
        representatives: [],
      },
    ],
    rank2Ascendants: [],
    rank3Siblings: [],
  });

  // 範囲設定
  const [minValue] = useState<number>(5000); // 5,000万円（固定）
  const [maxValue, setMaxValue] = useState<number>(100000); // 10億円

  // テーブルデータの生成
  const tableData = useMemo<TaxCalculationResult[]>(() => {
    const data: TaxCalculationResult[] = [];
    const step = 500; // 500万円刻み

    for (let value = minValue; value <= maxValue; value += step) {
      const result = calculateInheritanceTax(value, composition);
      data.push(result);
    }

    return data;
  }, [minValue, maxValue, composition]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* 左カラム：設定パネル */}
          <div className="lg:col-span-1 space-y-6">
            <HeirSettings composition={composition} onChange={setComposition} />
            <RangeSettings
              minValue={minValue}
              maxValue={maxValue}
              onMaxValueChange={setMaxValue}
            />
            <ExcelExport
              data={tableData}
              composition={composition}
              hasSpouse={composition.hasSpouse}
            />
            <PrintButton />
          </div>

          {/* 右カラム：テーブル */}
          <div className="lg:col-span-2">
            <TaxTable data={tableData} hasSpouse={composition.hasSpouse} />
          </div>
        </div>

        {/* 注意事項 */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-8 no-print">
          <h3 className="font-bold text-yellow-800 mb-2">ご注意</h3>
          <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
            <li>この早見表は概算です。実際の税額は個別の事情により異なります。</li>
            <li>配偶者控除は配偶者の法定相続分（最大1.6億円）まで非課税となります。</li>
            <li>第3順位（兄弟姉妹）の相続人には2割加算が適用されます。</li>
            <li>詳細は税理士にご相談ください。</li>
          </ul>
        </div>
      </main>

      <footer className="bg-gray-800 text-white py-6 mt-12 no-print">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm">
          <p>&copy; 2026 相続税早見表アプリケーション</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
