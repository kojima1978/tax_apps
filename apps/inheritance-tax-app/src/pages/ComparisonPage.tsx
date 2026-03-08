import { useState, useCallback, useMemo, useRef } from 'react';
import Landmark from 'lucide-react/icons/landmark';
import { Header } from '../components/Header';
import { HeirSettings } from '../components/HeirSettings';
import { SectionHeader } from '../components/SectionHeader';
import { CurrencyInput } from '../components/CurrencyInput';
import { ComparisonTable } from '../components/comparison/ComparisonTable';
import { CalculateButton } from '../components/CalculateButton';
import { ValidationErrorPanel } from '../components/ValidationErrorPanel';
import { PrintHeader } from '../components/PrintHeader';
import { CautionBox } from '../components/CautionBox';
import { StatusCard } from '../components/StatusCard';
import { useScrollToResult } from '../hooks/useScrollToResult';
import type { HeirComposition } from '../types';
import { createDefaultComposition } from '../constants';
import { COMPARISON_CAUTIONS } from '../constants/cautionMessages';
import { calculateComparisonTable } from '../utils';
import { CARD } from '../components/tableStyles';

export const ComparisonPage: React.FC = () => {
  const [composition, setComposition] = useState<HeirComposition>(createDefaultComposition);
  const [estateValue, setEstateValue] = useState<number>(0);
  const [spouseOwnEstate, setSpouseOwnEstate] = useState<number>(0);

  const [comparisonData, setComparisonData] = useState<ReturnType<typeof calculateComparisonTable>>([]);
  const [hasAttempted, setHasAttempted] = useState(false);

  const heirRef = useRef<HTMLDivElement>(null);
  const estateRef = useRef<HTMLDivElement>(null);

  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (estateValue <= 0) errors.push('相続財産額を入力してください');
    if (!composition.hasSpouse) errors.push('配偶者ありの構成を選択してください（1次2次比較に必要）');
    return errors;
  }, [estateValue, composition.hasSpouse]);

  const handleCalculate = useCallback(() => {
    setHasAttempted(true);
    if (estateValue <= 0) {
      estateRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!composition.hasSpouse) {
      heirRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setComparisonData(calculateComparisonTable(estateValue, spouseOwnEstate, composition));
  }, [estateValue, spouseOwnEstate, composition]);

  const hasData = comparisonData.length > 0;
  const resultRef = useScrollToResult(hasData);

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 comparison-print">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 no-print">
          <div ref={heirRef} className="space-y-6">
            <HeirSettings
              composition={composition}
              onChange={setComposition}
              hasError={hasAttempted && !composition.hasSpouse}
            />
          </div>

          <div className="space-y-6">
            {/* 相続財産入力 */}
            <div
              ref={estateRef}
              className={`${CARD} ${hasAttempted && estateValue <= 0 ? 'ring-2 ring-red-400' : ''}`}
            >
              <SectionHeader icon={Landmark} title="相続財産" />
              <div className="space-y-4">
                <CurrencyInput
                  id="estate-value"
                  label="対象者の相続財産額"
                  value={estateValue}
                  onChange={setEstateValue}
                  placeholder="例: 20000"
                  hasError={hasAttempted && estateValue <= 0}
                />
                <CurrencyInput
                  id="spouse-estate"
                  label="配偶者の固有財産額"
                  value={spouseOwnEstate}
                  onChange={setSpouseOwnEstate}
                  placeholder="例: 5000"
                />
              </div>
            </div>

            <CautionBox items={COMPARISON_CAUTIONS} />
          </div>
        </div>

        <div className="mb-8 no-print">
          <ValidationErrorPanel show={hasAttempted} errors={validationErrors} />
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

        <div ref={resultRef}>
          {hasData && (
            <div className="result-fade-in">
              <PrintHeader title="1次相続・2次相続 配偶者取得割合別比較" />
              <ComparisonTable data={comparisonData} spouseOwnEstate={spouseOwnEstate} />
            </div>
          )}
        </div>
      </main>
    </>
  );
};
