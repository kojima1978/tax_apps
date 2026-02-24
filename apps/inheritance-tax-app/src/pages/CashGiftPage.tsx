import { Header } from '../components/Header';
import { HeirSettings } from '../components/HeirSettings';
import { EstateInput } from '../components/EstateInput';
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
import { useCashGiftSimulation } from '../hooks/useCashGiftSimulation';
import { formatCurrency } from '../utils';
import { CASH_GIFT_CAUTIONS } from '../constants/cautionMessages';

export const CashGiftPage: React.FC = () => {
  const {
    composition, setComposition,
    estateValue, setEstateValue,
    spouseMode, setSpouseMode,
    recipients, setRecipients,
    recipientOptions,
    cleanedRecipients,
    result,
    calcInputs,
    handleCalculate,
    totalGiftsInput,
    noEligibleRecipients,
  } = useCashGiftSimulation();

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
            <EstateInput
              value={estateValue}
              onChange={setEstateValue}
              label="遺産総額（贈与前の相続財産額）"
              placeholder="例: 20000"
            />
            <SpouseAcquisitionSettings
              value={spouseMode}
              onChange={setSpouseMode}
              hasSpouse={composition.hasSpouse}
            />
            <CautionBox items={CASH_GIFT_CAUTIONS} />
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
