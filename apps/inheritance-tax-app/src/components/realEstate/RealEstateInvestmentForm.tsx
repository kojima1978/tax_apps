import Building2 from 'lucide-react/icons/building-2';
import type { RealEstateInvestmentInput } from '../../types';
import { CurrencyInput } from '../CurrencyInput';
import { SectionHeader } from '../SectionHeader';
import { CARD, INPUT_FOCUS } from '../tableStyles';
import { formatCurrency } from '../../utils/formatters';

interface RealEstateInvestmentFormProps {
  value: RealEstateInvestmentInput;
  onChange: (patch: Partial<RealEstateInvestmentInput>) => void;
  hasError?: boolean;
}

interface RateInputProps {
  id: string;
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
}

const RateInput = ({ id, label, hint, value, onChange }: RateInputProps) => (
  <div>
    <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
    <p id={`${id}-hint`} className="mb-1.5 text-xs text-gray-500">{hint}</p>
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="number"
        min={0}
        max={100}
        step={1}
        inputMode="decimal"
        value={value}
        aria-describedby={`${id}-hint`}
        onChange={event => onChange(Number(event.target.value) || 0)}
        onWheel={event => event.currentTarget.blur()}
        className={`w-full rounded-lg border border-gray-300 px-4 py-2.5 text-right text-lg transition-all duration-200 hover:border-green-400 hover:bg-green-50/30 ${INPUT_FOCUS}`}
      />
      <span className="whitespace-nowrap font-medium text-gray-600">%</span>
    </div>
  </div>
);

export const RealEstateInvestmentForm = ({ value, onChange, hasError }: RealEstateInvestmentFormProps) => {
  const clampRate = (rate: number) => Math.min(100, Math.max(0, rate)) / 100;
  const baseAssessedValue = Math.floor(
    Math.max(0, value.investmentAmount) * (1 - clampRate(value.compressionRate)),
  );
  const estimatedValue = Math.floor(
    baseAssessedValue * (1 - clampRate(value.leaseholdRightRate) * clampRate(value.tenantRightRate)),
  );

  return (
    <section className={`${CARD} ${hasError ? 'ring-2 ring-red-400' : ''}`} aria-labelledby="real-estate-input-heading">
      <SectionHeader icon={Building2} title="不動産投資" />
      <fieldset className="rounded-lg border border-green-200 bg-green-50/30 p-4">
        <legend id="real-estate-input-heading" className="sr-only">不動産投資の条件</legend>
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">投資条件</span>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">賃貸不動産</span>
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
        <CurrencyInput
          id="real-estate-investment-amount"
          label="投下資金"
          hint="現金から不動産へ組み替える金額"
          value={value.investmentAmount}
          onChange={investmentAmount => onChange({ investmentAmount })}
          placeholder="例: 10000"
        />
        <RateInput
          id="real-estate-compression-rate"
          label="圧縮率"
          hint="時価から相続税評価額への基本的な圧縮率"
          value={value.compressionRate}
          onChange={compressionRate => onChange({ compressionRate })}
        />
        <RateInput
          id="real-estate-leasehold-rate"
          label="借地権割合"
          hint="路線価図・評価倍率表で確認"
          value={value.leaseholdRightRate}
          onChange={leaseholdRightRate => onChange({ leaseholdRightRate })}
        />
        <RateInput
          id="real-estate-tenant-rate"
          label="借家権割合"
          hint="地域の財産評価基準書で確認"
          value={value.tenantRightRate}
          onChange={tenantRightRate => onChange({ tenantRightRate })}
        />
        </div>

        {value.investmentAmount > 0 && (
          <div className="mt-4 space-y-1 rounded bg-white px-3 py-2 text-xs text-gray-600">
            <div className="flex justify-between gap-4">
              <span>基本圧縮後の評価額</span>
              <span className="font-medium">{formatCurrency(baseAssessedValue)}</span>
            </div>
            <div className="flex justify-between gap-4 text-green-700">
              <span>借地権・借家権調整後（概算）</span>
              <span className="font-semibold">{formatCurrency(estimatedValue)}</span>
            </div>
          </div>
        )}
      </fieldset>
    </section>
  );
};
