import { useState, useMemo, useCallback } from 'react';
import Landmark from 'lucide-react/icons/landmark';
import { Header } from '../components/Header';
import { HeirSettings } from '../components/HeirSettings';
import { SectionHeader } from '../components/SectionHeader';
import { CurrencyInput } from '../components/CurrencyInput';
import { SpouseAcquisitionSettings } from '../components/calculator/SpouseAcquisitionSettings';
import { CashGiftRecipientList } from '../components/gift/CashGiftRecipientList';
import { CashGiftSummaryCard } from '../components/gift/CashGiftSummaryCard';
import { CashGiftFlowSteps } from '../components/gift/CashGiftFlowSteps';
import { CashGiftHeirTable } from '../components/gift/CashGiftHeirTable';
import { CashGiftExcelExport } from '../components/gift/CashGiftExcelExport';
import { CashGiftYearComparison } from '../components/gift/CashGiftYearComparison';
import { CalculateButton } from '../components/CalculateButton';
import { PrintHeader } from '../components/PrintHeader';
import { CautionBox } from '../components/CautionBox';
import { StatusCard } from '../components/StatusCard';
import { useCleanOptions } from '../hooks/useCleanOptions';
import type { HeirComposition, SpouseAcquisitionMode, GiftRecipient, CashGiftSimulationResult } from '../types';
import { createDefaultComposition } from '../constants';
import { calculateCashGiftSimulation, getGiftRecipientOptions, formatCurrency } from '../utils';

export const CashGiftPage: React.FC = () => {
  const [composition, setComposition] = useState<HeirComposition>(createDefaultComposition);
  const [estateValue, setEstateValue] = useState<number>(0);
  const [spouseMode, setSpouseMode] = useState<SpouseAcquisitionMode>({ mode: 'legal' });
  const [recipients, setRecipients] = useState<GiftRecipient[]>([]);

  const recipientOptions = useMemo(
    () => getGiftRecipientOptions(composition),
    [composition],
  );

  // 相続人構成が変わったら、無効な受取人をクリーンアップ
  const getRecipientId = useCallback((r: GiftRecipient) => r.heirId, []);
  const setRecipientId = useCallback((r: GiftRecipient, id: string, label: string) => ({ ...r, heirId: id, heirLabel: label }), []);
  const cleanedRecipients = useCleanOptions(recipients, recipientOptions, getRecipientId, setRecipientId);

  const [result, setResult] = useState<CashGiftSimulationResult | null>(null);
  const [calcInputs, setCalcInputs] = useState<{
    estateValue: number;
    composition: HeirComposition;
    recipients: GiftRecipient[];
    spouseMode: SpouseAcquisitionMode;
  } | null>(null);

  const handleCalculate = useCallback(() => {
    if (estateValue <= 0 || cleanedRecipients.length === 0 || cleanedRecipients.every(r => r.annualAmount <= 0 || r.years <= 0)) {
      setResult(null);
      setCalcInputs(null);
      return;
    }
    setResult(calculateCashGiftSimulation(estateValue, composition, cleanedRecipients, spouseMode));
    setCalcInputs({ estateValue, composition, recipients: cleanedRecipients, spouseMode });
  }, [estateValue, composition, cleanedRecipients, spouseMode]);

  const totalGiftsInput = useMemo(
    () => cleanedRecipients.reduce((s, r) => s + r.annualAmount * r.years, 0),
    [cleanedRecipients],
  );

  const noEligibleRecipients = composition.selectedRank !== 'rank1' && composition.selectedRank !== 'none';

  const excelAction = result
    ? <CashGiftExcelExport result={result} composition={composition} estateValue={estateValue} recipients={cleanedRecipients} />
    : undefined;

  return (
    <>
      <Header actions={excelAction} />
      <main className="max-w-7xl mx-auto px-4 py-8 cash-gift-print">
        {/* 入力エリア */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 no-print">
          <div className="space-y-6">
            <HeirSettings composition={composition} onChange={setComposition} />
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <SectionHeader icon={Landmark} title="遺産総額" />
              <CurrencyInput
                id="estate-value"
                label="遺産総額（贈与前の相続財産額）"
                value={estateValue}
                onChange={setEstateValue}
                placeholder="例: 20000"
              />
            </div>
            <SpouseAcquisitionSettings
              value={spouseMode}
              onChange={setSpouseMode}
              hasSpouse={composition.hasSpouse}
            />
            <CautionBox
              items={[
                '特例贈与税率（直系尊属から18歳以上の子・孫への贈与）のみ対応しています。',
                '贈与税の基礎控除は年間110万円/受取人です。',
                '生前贈与加算（相続開始前7年以内の贈与を相続財産に加算する制度）は考慮していません。',
                '相続時精算課税制度は含めていません。',
                '実際の税額は個別の事情により異なります。詳細は税理士にご相談ください。',
              ]}
            />
          </div>
        </div>

        {/* 受取人入力 */}
        {!noEligibleRecipients && (
          <div className="mb-8 no-print">
            <CashGiftRecipientList
              recipients={recipients}
              recipientOptions={recipientOptions}
              onChange={setRecipients}
            />
          </div>
        )}

        <div className="mb-8 no-print">
          <CalculateButton onClick={handleCalculate} />
        </div>

        {/* 贈与超過警告 */}
        {estateValue > 0 && totalGiftsInput > estateValue && (
          <StatusCard
            variant="error"
            title={`贈与総額（${formatCurrency(totalGiftsInput)}）が遺産総額（${formatCurrency(estateValue)}）を超えています`}
            description="贈与額を見直してください"
            compact
            className="mb-8 no-print"
          />
        )}

        {/* rank2/rank3警告 */}
        {noEligibleRecipients && (
          <StatusCard
            variant="warning"
            title="特例贈与の対象者がいません"
            description="特例贈与税率は直系尊属（親・祖父母）から18歳以上の子・孫への贈与に適用されます。第1順位（子）を選択してください。"
            className="mb-8 no-print"
          />
        )}

        {/* 結果表示 */}
        {result && (
          <>
            <PrintHeader title="現金贈与シミュレーション" />
            <div className="space-y-6">
              <CashGiftSummaryCard result={result} />
              <CashGiftFlowSteps result={result} />
              <CashGiftHeirTable result={result} />
              {calcInputs && (
                <CashGiftYearComparison
                  estateValue={calcInputs.estateValue}
                  composition={calcInputs.composition}
                  recipients={calcInputs.recipients}
                  spouseMode={calcInputs.spouseMode}
                />
              )}
            </div>
          </>
        )}

        {/* 未入力ガイド */}
        {!result && estateValue > 0 && !noEligibleRecipients && (
          <StatusCard
            variant="success"
            title="贈与受取人を追加してください"
            description="受取人と年間贈与額・贈与年数を入力すると、シミュレーション結果が表示されます。"
            className="no-print"
          />
        )}
      </main>
    </>
  );
};
