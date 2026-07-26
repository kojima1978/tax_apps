import { useState, useCallback, useMemo, useRef } from 'react';
import Landmark from 'lucide-react/icons/landmark';
import Clock from 'lucide-react/icons/clock';
import { PageLayout } from '../components/PageLayout';
import { HeirSettings } from '../components/HeirSettings';
import { SectionHeader } from '../components/SectionHeader';
import { CurrencyInput } from '../components/CurrencyInput';
import { YearSelector } from '../components/timeline/YearSelector';
import { TimelineSummary } from '../components/timeline/TimelineSummary';
import { TimelineTable } from '../components/timeline/TimelineTable';
import { PrintConditions } from '../components/PrintConditions';
import { PrintHeader } from '../components/PrintHeader';
import { CautionBox } from '../components/CautionBox';
import { StatusCard } from '../components/StatusCard';
import { useScrollToResult } from '../hooks/useScrollToResult';
import { useFormValidation } from '../hooks/useFormValidation';
import type { HeirComposition, TimelineSimulationResult } from '../types';
import { createDefaultComposition } from '../constants';
import { TIMELINE_CAUTIONS } from '../constants/cautionMessages';
import { calculateTimelineSimulation } from '../utils/timelineCalculator';
import { formatCurrency, formatSignedCurrency, formatPrintDate } from '../utils';
import { CARD } from '../components/tableStyles';

/**
 * 「計算する」を押した時点の入力値ごと保持するスナップショット。
 * 前提条件の表示を現在の入力値ではなくこの値から組み立てることで、
 * 再計算せずに印刷しても表と前提条件が食い違わないようにする。
 */
interface TimelineResult {
  simulation: TimelineSimulationResult;
  estateValue: number;
  spouseOwnEstate: number;
  annualChange: number;
  selectedYears: number[];
  composition: HeirComposition;
  calculatedAt: Date;
}

export const TimelinePage: React.FC = () => {
  const [composition, setComposition] = useState<HeirComposition>(createDefaultComposition);
  const [estateValue, setEstateValue] = useState<number>(0);
  const [spouseOwnEstate, setSpouseOwnEstate] = useState<number>(0);
  const [annualChange, setAnnualChange] = useState<number>(0);
  const [selectedYears, setSelectedYears] = useState<number[]>([5, 10, 15]);
  const [result, setResult] = useState<TimelineResult | null>(null);

  const heirRef = useRef<HTMLDivElement>(null);
  const estateRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);

  const onValid = useCallback(() => {
    setResult({
      simulation: calculateTimelineSimulation(
        estateValue,
        spouseOwnEstate,
        annualChange,
        selectedYears,
        composition,
      ),
      estateValue,
      spouseOwnEstate,
      annualChange,
      selectedYears,
      composition,
      calculatedAt: new Date(),
    });
  }, [estateValue, spouseOwnEstate, annualChange, selectedYears, composition]);

  const { validationErrors, hasAttempted, handleCalculate } = useFormValidation([
    { condition: estateValue <= 0, ref: estateRef, message: '相続財産額を入力してください' },
    { condition: !composition.hasSpouse, ref: heirRef, message: '配偶者ありの構成を選択してください（1次2次比較に必要）' },
    { condition: selectedYears.length === 0, ref: yearRef, message: 'シミュレーション年数を1つ以上選択してください' },
  ], onValid);

  const hasData = result !== null;
  const resultRef = useScrollToResult(hasData);

  /** 表示中の結果が現在の入力と食い違っているか（再計算忘れの検知） */
  const isStale = useMemo(() => {
    if (!result) return false;
    const sorted = (years: number[]) => JSON.stringify([...years].sort((a, b) => a - b));
    return result.estateValue !== estateValue
      || result.spouseOwnEstate !== spouseOwnEstate
      || result.annualChange !== annualChange
      || sorted(result.selectedYears) !== sorted(selectedYears)
      // 相続人構成は毎回新しいオブジェクトが作られるため値で比較する
      || JSON.stringify(result.composition) !== JSON.stringify(composition);
  }, [result, estateValue, spouseOwnEstate, annualChange, selectedYears, composition]);

  const printSections = useMemo(() => {
    if (!result) return [];
    const { annualChange: change } = result;
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
          { label: '年間収支', value: `${formatSignedCurrency(change)}/年${change < 0 ? '（資産減少）' : change > 0 ? '（資産増加）' : ''}` },
          // state の配列を直接 sort すると破壊的変更になるためコピーしてから並べ替える
          { label: 'シミュレーション年数', value: [...result.selectedYears].sort((a, b) => a - b).map(y => `${y}年後`).join(' / ') },
        ],
      },
    ];
  }, [result]);

  return (
    <PageLayout
      printClassName="timeline-print"
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

          <div
            ref={yearRef}
            className={`${CARD} ${hasAttempted && selectedYears.length === 0 ? 'ring-2 ring-red-400' : ''}`}
          >
            <SectionHeader icon={Clock} title="時間軸設定" />
            <div className="space-y-4">
              <div>
                <label htmlFor="annual-change" className="block text-sm font-medium text-gray-700 mb-1">
                  年間収支（配偶者の資産増減）
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="annual-change"
                    type="number"
                    value={annualChange || ''}
                    onChange={(e) => setAnnualChange(Number(e.target.value) || 0)}
                    onWheel={(e) => e.currentTarget.blur()}
                    step={100}
                    inputMode="numeric"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg transition-all duration-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:shadow-md focus:shadow-green-500/10 text-right text-lg hover:border-green-400 hover:bg-green-50/30"
                    placeholder="例: -300（年間300万円減少）"
                  />
                  <span className="text-gray-600 whitespace-nowrap font-medium">万円/年</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  マイナス = 資産減少（生活費等）、プラス = 資産増加（年金収入等の余剰）
                </p>
              </div>
              <YearSelector selectedYears={selectedYears} onChange={setSelectedYears} />
            </div>
          </div>

          <CautionBox items={TIMELINE_CAUTIONS} />
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
            description="タイムライン比較は、配偶者がいる場合の1次2次相続を時間軸で比較する機能です。"
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
              title="2次相続タイムライン・シミュレーション"
              date={formatPrintDate(result.calculatedAt)}
            />
            <PrintConditions
              sections={printSections}
              composition={result.composition}
            />
            <TimelineSummary summaries={result.simulation.summaries} annualChange={result.annualChange} />
            <TimelineTable result={result.simulation} spouseOwnEstate={result.spouseOwnEstate} />
          </div>
        ) : null
      }
    />
  );
};
