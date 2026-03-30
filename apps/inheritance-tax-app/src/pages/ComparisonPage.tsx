import { useState, useCallback, useMemo, useRef } from 'react';
import Landmark from 'lucide-react/icons/landmark';
import { PageLayout } from '../components/PageLayout';
import { HeirSettings } from '../components/HeirSettings';
import { SectionHeader } from '../components/SectionHeader';
import { CurrencyInput } from '../components/CurrencyInput';
import { ComparisonTable } from '../components/comparison/ComparisonTable';
import { PrintConditions } from '../components/PrintConditions';
import { PrintHeader } from '../components/PrintHeader';
import { CautionBox } from '../components/CautionBox';
import { StatusCard } from '../components/StatusCard';
import { useScrollToResult } from '../hooks/useScrollToResult';
import { useFormValidation } from '../hooks/useFormValidation';
import type { HeirComposition } from '../types';
import { createDefaultComposition } from '../constants';
import { COMPARISON_CAUTIONS } from '../constants/cautionMessages';
import { calculateComparisonTable, formatCurrency } from '../utils';
import { CARD } from '../components/tableStyles';

export const ComparisonPage: React.FC = () => {
  const [composition, setComposition] = useState<HeirComposition>(createDefaultComposition);
  const [estateValue, setEstateValue] = useState<number>(0);
  const [spouseOwnEstate, setSpouseOwnEstate] = useState<number>(0);
  const [comparisonData, setComparisonData] = useState<ReturnType<typeof calculateComparisonTable>>([]);

  const heirRef = useRef<HTMLDivElement>(null);
  const estateRef = useRef<HTMLDivElement>(null);

  const onValid = useCallback(() => {
    setComparisonData(calculateComparisonTable(estateValue, spouseOwnEstate, composition));
  }, [estateValue, spouseOwnEstate, composition]);

  const { validationErrors, hasAttempted, handleCalculate } = useFormValidation([
    { condition: estateValue <= 0, ref: estateRef, message: '相続財産額を入力してください' },
    { condition: !composition.hasSpouse, ref: heirRef, message: '配偶者ありの構成を選択してください（1次2次比較に必要）' },
  ], onValid);

  const hasData = comparisonData.length > 0;
  const resultRef = useScrollToResult(hasData);

  const printSections = useMemo(() => [
    {
      title: '1次相続',
      items: [
        { label: '相続財産額', value: formatCurrency(estateValue) },
      ],
    },
    {
      title: '2次相続',
      items: [
        { label: '配偶者固有財産', value: formatCurrency(spouseOwnEstate) },
      ],
    },
  ], [estateValue, spouseOwnEstate]);

  return (
    <PageLayout
      printClassName="comparison-print"
      leftSection={
        <div ref={heirRef}>
          <HeirSettings
            composition={composition}
            onChange={setComposition}
            hasError={hasAttempted && !composition.hasSpouse}
          />
        </div>
      }
      rightSection={
        <>
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
        </>
      }
      validationErrors={validationErrors}
      hasAttempted={hasAttempted}
      onCalculate={handleCalculate}
      belowButton={
        !composition.hasSpouse && estateValue > 0 ? (
          <StatusCard
            variant="warning"
            title="配偶者ありの構成を選択してください"
            description="1次2次比較は、配偶者がいる場合の取得割合による税額の変化を比較する機能です。"
            className="no-print"
          />
        ) : undefined
      }
      resultRef={resultRef}
      resultSection={
        hasData ? (
          <div className="result-fade-in space-y-4 md:space-y-6">
            <PrintHeader title="1次相続・2次相続 配偶者取得割合別比較" />
            <PrintConditions sections={printSections} composition={composition} />
            <ComparisonTable data={comparisonData} spouseOwnEstate={spouseOwnEstate} />
          </div>
        ) : null
      }
    />
  );
};
