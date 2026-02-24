import { useState, useCallback } from 'react';
import Landmark from 'lucide-react/icons/landmark';
import { Header } from '../components/Header';
import { HeirSettings } from '../components/HeirSettings';
import { SectionHeader } from '../components/SectionHeader';
import { CurrencyInput } from '../components/CurrencyInput';
import { ComparisonTable } from '../components/comparison/ComparisonTable';
import { ComparisonExcelExport } from '../components/comparison/ComparisonExcelExport';
import { CalculateButton } from '../components/CalculateButton';
import { PrintHeader } from '../components/PrintHeader';
import { CautionBox } from '../components/CautionBox';
import { StatusCard } from '../components/StatusCard';
import type { HeirComposition } from '../types';
import { createDefaultComposition } from '../constants';
import { COMPARISON_CAUTIONS } from '../constants/cautionMessages';
import { calculateComparisonTable } from '../utils';

export const ComparisonPage: React.FC = () => {
  const [composition, setComposition] = useState<HeirComposition>(createDefaultComposition);
  const [estateValue, setEstateValue] = useState<number>(0);
  const [spouseOwnEstate, setSpouseOwnEstate] = useState<number>(0);

  const [comparisonData, setComparisonData] = useState<ReturnType<typeof calculateComparisonTable>>([]);

  const handleCalculate = useCallback(() => {
    if (estateValue <= 0 || !composition.hasSpouse) {
      setComparisonData([]);
      return;
    }
    setComparisonData(calculateComparisonTable(estateValue, spouseOwnEstate, composition));
  }, [estateValue, spouseOwnEstate, composition]);

  const hasData = comparisonData.length > 0;

  const excelAction = hasData
    ? <ComparisonExcelExport data={comparisonData} composition={composition} estateValue={estateValue} spouseOwnEstate={spouseOwnEstate} />
    : undefined;

  return (
    <>
      <Header actions={excelAction} />
      <main className="max-w-7xl mx-auto px-4 py-8 comparison-print">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 no-print">
          <div className="space-y-6">
            <HeirSettings composition={composition} onChange={setComposition} />
          </div>

          <div className="space-y-6">
            {/* 相続財産入力 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <SectionHeader icon={Landmark} title="相続財産" />
              <div className="space-y-4">
                <CurrencyInput id="estate-value" label="対象者の相続財産額" value={estateValue} onChange={setEstateValue} placeholder="例: 20000" />
                <CurrencyInput id="spouse-estate" label="配偶者の固有財産額" value={spouseOwnEstate} onChange={setSpouseOwnEstate} placeholder="例: 5000" />
              </div>
            </div>

            <CautionBox items={COMPARISON_CAUTIONS} />
          </div>
        </div>

        <div className="mb-8 no-print">
          <CalculateButton onClick={handleCalculate} />
        </div>

        {!composition.hasSpouse && estateValue > 0 && (
          <StatusCard
            variant="warning"
            title="配偶者ありの構成を選択してください"
            description="1次2次比較は、配偶者がいる場合の取得割合による税額の変化を比較する機能です。"
            className="no-print"
          />
        )}

        {hasData && (
          <>
            <PrintHeader title="1次相続・2次相続 配偶者取得割合別比較" />
            <ComparisonTable data={comparisonData} spouseOwnEstate={spouseOwnEstate} />
          </>
        )}
      </main>
    </>
  );
};
