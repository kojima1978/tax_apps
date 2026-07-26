import { useState, useCallback, useMemo, useRef } from 'react';
import Landmark from 'lucide-react/icons/landmark';
import { PageLayout } from '../components/PageLayout';
import { HeirSettings } from '../components/HeirSettings';
import { SectionHeader } from '../components/SectionHeader';
import { CurrencyInput } from '../components/CurrencyInput';
import { ComparisonTable } from '../components/comparison/ComparisonTable';
import { PrintConditions } from '../components/PrintConditions';
import { PrintCautions } from '../components/PrintCautions';
import { PrintHeader } from '../components/PrintHeader';
import { CautionBox } from '../components/CautionBox';
import { StatusCard } from '../components/StatusCard';
import { useScrollToResult } from '../hooks/useScrollToResult';
import { useFormValidation } from '../hooks/useFormValidation';
import type { HeirComposition, ComparisonRow } from '../types';
import { createDefaultComposition } from '../constants';
import { COMPARISON_CAUTIONS, COMPARISON_PRINT_CAUTIONS } from '../constants/cautionMessages';
import { calculateComparisonTable, formatCurrency, formatPrintDate } from '../utils';
import { CARD } from '../components/tableStyles';

/**
 * 「計算する」を押した時点の入力値ごと保持するスナップショット。
 * 前提条件の表示を現在の入力値ではなくこの値から組み立てることで、
 * 再計算せずに印刷しても表と前提条件が食い違わないようにする。
 */
interface ComparisonResult {
  rows: ComparisonRow[];
  estateValue: number;
  spouseOwnEstate: number;
  composition: HeirComposition;
  calculatedAt: Date;
}

export const ComparisonPage: React.FC = () => {
  const [composition, setComposition] = useState<HeirComposition>(createDefaultComposition);
  const [estateValue, setEstateValue] = useState<number>(0);
  const [spouseOwnEstate, setSpouseOwnEstate] = useState<number>(0);
  const [result, setResult] = useState<ComparisonResult | null>(null);

  const heirRef = useRef<HTMLDivElement>(null);
  const estateRef = useRef<HTMLDivElement>(null);

  const onValid = useCallback(() => {
    setResult({
      rows: calculateComparisonTable(estateValue, spouseOwnEstate, composition),
      estateValue,
      spouseOwnEstate,
      composition,
      calculatedAt: new Date(),
    });
  }, [estateValue, spouseOwnEstate, composition]);

  const { validationErrors, hasAttempted, handleCalculate } = useFormValidation([
    { condition: estateValue <= 0, ref: estateRef, message: '相続財産額を入力してください' },
    { condition: !composition.hasSpouse, ref: heirRef, message: '配偶者ありの構成を選択してください（1次2次比較に必要）' },
  ], onValid);

  const hasData = result !== null && result.rows.length > 0;
  const resultRef = useScrollToResult(hasData);

  /** 表示中の結果が現在の入力と食い違っているか（再計算忘れの検知） */
  const isStale = useMemo(() => {
    if (!result) return false;
    return result.estateValue !== estateValue
      || result.spouseOwnEstate !== spouseOwnEstate
      // 相続人構成は毎回新しいオブジェクトが作られるため値で比較する
      || JSON.stringify(result.composition) !== JSON.stringify(composition);
  }, [result, estateValue, spouseOwnEstate, composition]);

  const printSections = useMemo(() => {
    if (!result) return [];
    return [
      {
        title: '1次相続',
        items: [
          { label: '相続財産額', value: formatCurrency(result.estateValue) },
        ],
      },
      {
        title: '2次相続',
        items: [
          { label: '配偶者固有財産', value: formatCurrency(result.spouseOwnEstate) },
        ],
      },
    ];
  }, [result]);

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
                hint="基礎控除を差し引く前の金額（債務・葬式費用控除後の課税価格）を入力してください"
                value={estateValue}
                onChange={setEstateValue}
                placeholder="例: 20000"
                hasError={hasAttempted && estateValue <= 0}
              />
              <CurrencyInput
                id="spouse-estate"
                label="配偶者の固有財産額"
                hint={spouseOwnEstate <= 0 ? '未入力の場合は0円として計算します（2次相続の税額が小さく出ます）' : undefined}
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
        hasData && result ? (
          <div className="result-fade-in space-y-4 md:space-y-6">
            {isStale && (
              <StatusCard
                variant="warning"
                compact
                title="入力が変更されています"
                description="下の結果は変更前の入力で計算したものです。「計算する」を押して再計算してください。"
                className="no-print"
              />
            )}
            <PrintHeader
              title="1次相続・2次相続 配偶者取得割合別比較"
              date={formatPrintDate(result.calculatedAt)}
            />
            <PrintConditions sections={printSections} composition={result.composition} />
            <ComparisonTable data={result.rows} spouseOwnEstate={result.spouseOwnEstate} />
            <PrintCautions items={COMPARISON_PRINT_CAUTIONS} />
          </div>
        ) : null
      }
    />
  );
};
