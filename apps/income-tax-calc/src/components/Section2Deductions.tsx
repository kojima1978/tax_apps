import CurrencyInput from '@/components/CurrencyInput';
import FieldRow from '@/components/FieldRow';
import type { FormState } from '@/hooks/useTaxForm';
import type { DeductionBreakdown } from '@/lib/tax-calc';

interface Props {
  form: FormState;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  deduction: DeductionBreakdown;
}

export default function Section2Deductions({ form, updateField, deduction }: Props) {
  return (
    <section className="animate-fade-in">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-green-800 text-white px-4 py-2.5">
          <h2 className="text-sm font-bold tracking-wide">所得から差し引かれる金額（所得控除）</h2>
        </div>
        <div className="px-4 py-2 divide-y divide-gray-100">
          {/* 社会保険料控除 */}
          <FieldRow
            symbol="⑬"
            symbolColor="bg-green-100 text-green-800"
            label="社会保険料控除"
            subText="健康保険・年金保険料等の合計"
          >
            <div className="flex items-center gap-2">
              <CurrencyInput
                value={form.socialInsurance}
                onChange={v => updateField('socialInsurance', v)}
                placeholder="0"
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">円</span>
            </div>
          </FieldRow>

          {/* 医療費控除 */}
          <FieldRow
            symbol="⑭"
            symbolColor="bg-green-100 text-green-800"
            label="医療費控除"
            subText="医療費 − 保険金等 − 10万円（または所得の5%）"
          >
            <div className="flex items-center gap-2">
              <CurrencyInput
                value={form.medical}
                onChange={v => updateField('medical', v)}
                placeholder="0"
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">円</span>
            </div>
          </FieldRow>

          {/* 生命保険料控除 */}
          <FieldRow
            symbol="⑮"
            symbolColor="bg-green-100 text-green-800"
            label="生命保険料控除"
            subText="一般・介護医療・個人年金の合計（最高12万円）"
          >
            <div className="flex items-center gap-2">
              <CurrencyInput
                value={form.lifeInsurance}
                onChange={v => updateField('lifeInsurance', v)}
                placeholder="0"
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">円</span>
            </div>
          </FieldRow>

          {/* 地震保険料控除 */}
          <FieldRow
            symbol="⑯"
            symbolColor="bg-green-100 text-green-800"
            label="地震保険料控除"
            subText="最高5万円"
          >
            <div className="flex items-center gap-2">
              <CurrencyInput
                value={form.earthquakeInsurance}
                onChange={v => updateField('earthquakeInsurance', v)}
                placeholder="0"
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">円</span>
            </div>
          </FieldRow>

          {/* 配偶者控除・配偶者特別控除 */}
          <FieldRow
            symbol="㉒"
            symbolColor="bg-green-100 text-green-800"
            label={deduction.spouseDeductionType === 'special' ? '配偶者特別控除' : '配偶者控除'}
            resultValue={deduction.spouseDeduction}
            resultLabel="控除額"
          >
            <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={form.hasSpouse}
                onChange={e => updateField('hasSpouse', e.target.checked)}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              配偶者あり
            </label>
            {form.hasSpouse && (
              <div className="mt-1.5">
                <div className="text-xs text-gray-500 mb-0.5">配偶者の合計所得金額</div>
                <div className="flex items-center gap-2">
                  <CurrencyInput
                    value={form.spouseIncome}
                    onChange={v => updateField('spouseIncome', v)}
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500 whitespace-nowrap">円</span>
                </div>
              </div>
            )}
          </FieldRow>

          {/* 扶養控除 */}
          <FieldRow
            symbol="㉔"
            symbolColor="bg-green-100 text-green-800"
            label="扶養控除"
            resultValue={deduction.dependentDeduction}
            resultLabel="控除額"
          >
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <div>
                <div className="text-xs text-gray-500 mb-0.5">一般（38万）</div>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={form.dependentGeneral}
                  onChange={e => updateField('dependentGeneral', e.target.value)}
                  placeholder="0"
                  className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-right text-sm
                    focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">特定（63万）</div>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={form.dependentSpecific}
                  onChange={e => updateField('dependentSpecific', e.target.value)}
                  placeholder="0"
                  className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-right text-sm
                    focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">老人（48万）</div>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={form.dependentElderly}
                  onChange={e => updateField('dependentElderly', e.target.value)}
                  placeholder="0"
                  className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-right text-sm
                    focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">同居老親（58万）</div>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={form.dependentElderlyCohabit}
                  onChange={e => updateField('dependentElderlyCohabit', e.target.value)}
                  placeholder="0"
                  className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-right text-sm
                    focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                />
              </div>
            </div>
          </FieldRow>

          {/* 基礎控除 */}
          <FieldRow
            symbol="㉕"
            symbolColor="bg-green-100 text-green-800"
            label="基礎控除"
            subText="合計所得金額に応じて自動計算（令和7年分）"
            resultValue={deduction.basicDeduction}
            resultLabel="控除額"
          />

          {/* 寄附金控除 */}
          <FieldRow
            symbol="㉖"
            symbolColor="bg-green-100 text-green-800"
            label="寄附金控除"
            subText="ふるさと納税等（寄附金 − 2,000円）"
          >
            <div className="flex items-center gap-2">
              <CurrencyInput
                value={form.donation}
                onChange={v => updateField('donation', v)}
                placeholder="0"
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">円</span>
            </div>
          </FieldRow>
        </div>

        {/* 控除合計 */}
        <div className="bg-green-50 border-t border-green-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="field-label-symbol bg-green-700 text-white">㉚</span>
            <span className="text-sm font-bold text-green-900">所得控除合計</span>
          </div>
          <div className="font-mono-num text-lg font-bold text-green-900">
            {deduction.totalDeduction.toLocaleString('ja-JP')}<span className="text-sm font-normal ml-1">円</span>
          </div>
        </div>
      </div>
    </section>
  );
}
