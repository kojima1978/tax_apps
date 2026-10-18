import Building2 from 'lucide-react/icons/building-2';
import type { RealEstateInvestmentInput } from '../../types';
import { CurrencyInput } from '../CurrencyInput';
import { SectionHeader } from '../SectionHeader';
import { CARD, INPUT_FOCUS } from '../tableStyles';

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

export const RealEstateInvestmentForm = ({ value, onChange, hasError }: RealEstateInvestmentFormProps) => (
  <section className={`${CARD} ${hasError ? 'ring-2 ring-red-400' : ''}`} aria-labelledby="real-estate-input-heading">
    <SectionHeader icon={Building2} title="賃貸不動産の条件" />
    <div className="space-y-6">
      <fieldset>
        <legend id="real-estate-input-heading" className="mb-3 text-sm font-bold text-gray-800">購入価格（時価）</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CurrencyInput
            id="real-estate-land-price"
            label="土地の購入価格"
            value={value.landPurchasePrice}
            onChange={landPurchasePrice => onChange({ landPurchasePrice })}
            placeholder="例: 6000"
          />
          <CurrencyInput
            id="real-estate-building-price"
            label="建物の購入価格"
            value={value.buildingPurchasePrice}
            onChange={buildingPurchasePrice => onChange({ buildingPurchasePrice })}
            placeholder="例: 4000"
          />
        </div>
      </fieldset>

      <fieldset className="border-t border-gray-200 pt-5">
        <legend className="mb-3 text-sm font-bold text-gray-800">相続税評価の基礎額</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <CurrencyInput
            id="real-estate-land-self-use-value"
            label="土地の自用地評価額"
            hint="路線価方式または倍率方式で求めた、賃貸調整前の評価額"
            value={value.landSelfUseValue}
            onChange={landSelfUseValue => onChange({ landSelfUseValue })}
            placeholder="例: 4800"
          />
          <CurrencyInput
            id="real-estate-building-fixed-value"
            label="建物の固定資産税評価額"
            hint="固定資産税の課税明細書に記載された家屋の評価額"
            value={value.buildingFixedAssetTaxValue}
            onChange={buildingFixedAssetTaxValue => onChange({ buildingFixedAssetTaxValue })}
            placeholder="例: 2800"
          />
        </div>
      </fieldset>

      <fieldset className="border-t border-gray-200 pt-5">
        <legend className="mb-3 text-sm font-bold text-gray-800">賃貸による評価調整</legend>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
          <RateInput
            id="real-estate-rental-rate"
            label="賃貸割合"
            hint="課税時期に賃貸されている床面積の割合"
            value={value.rentalRate}
            onChange={rentalRate => onChange({ rentalRate })}
          />
        </div>
      </fieldset>
    </div>
  </section>
);
