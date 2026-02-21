import { useState, useMemo } from 'react';
import { Header } from '../components/Header';
import { HeirSettings } from '../components/HeirSettings';
import { EstateInput } from '../components/calculator/EstateInput';
import { SpouseAcquisitionSettings } from '../components/calculator/SpouseAcquisitionSettings';
import { CalculationResult } from '../components/calculator/CalculationResult';
import { CalculatorExcelExport } from '../components/calculator/CalculatorExcelExport';
import { CautionBox } from '../components/CautionBox';
import type { HeirComposition, SpouseAcquisitionMode } from '../types';
import { createDefaultComposition } from '../constants';
import { calculateDetailedInheritanceTax } from '../utils';

export const CalculatorPage: React.FC = () => {
  const [composition, setComposition] = useState<HeirComposition>(createDefaultComposition);

  const [estateValue, setEstateValue] = useState<number>(0);
  const [spouseMode, setSpouseMode] = useState<SpouseAcquisitionMode>({ mode: 'legal' });

  const result = useMemo(() => {
    if (estateValue <= 0) return null;
    return calculateDetailedInheritanceTax(estateValue, composition, spouseMode);
  }, [estateValue, composition, spouseMode]);

  const excelAction = result && result.taxableAmount > 0
    ? <CalculatorExcelExport result={result} composition={composition} spouseMode={spouseMode} />
    : undefined;

  return (
    <>
      <Header actions={excelAction} />
      <main className="max-w-7xl mx-auto px-4 py-8 calculator-print">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 no-print">
          <div className="space-y-6">
            <HeirSettings composition={composition} onChange={setComposition} />
          </div>
          <div className="space-y-6">
            <EstateInput value={estateValue} onChange={setEstateValue} />
            <SpouseAcquisitionSettings
              value={spouseMode}
              onChange={setSpouseMode}
              hasSpouse={composition.hasSpouse}
            />
            <CautionBox
              items={[
                'この計算は概算です。実際の税額は個別の事情により異なります。',
                '配偶者の税額軽減は、法定相続分または1億6,000万円のいずれか大きい額まで適用されます。',
                '第3順位（兄弟姉妹）の相続人には2割加算が適用されます。',
                '未成年者控除・障害者控除等の税額控除は考慮していません。',
                '詳細は税理士にご相談ください。',
              ]}
            />
          </div>
        </div>

        {result && result.taxableAmount > 0 && (
          <CalculationResult result={result} />
        )}

        {result && result.taxableAmount === 0 && estateValue > 0 && (
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-8 text-center">
            <p className="text-xl font-bold text-green-800 mb-2">相続税はかかりません</p>
            <p className="text-sm text-green-600">
              遺産総額（{result.estateValue.toLocaleString()}万円）が基礎控除額（{result.basicDeduction.toLocaleString()}万円）以下のため、課税されません。
            </p>
          </div>
        )}
      </main>
    </>
  );
};
