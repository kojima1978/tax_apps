import CurrencyInput from '@/components/CurrencyInput';
import FieldRow from '@/components/FieldRow';
import type { FormState } from '@/hooks/useTaxForm';
import type { IncomeBreakdown } from '@/lib/tax-calc';

interface Props {
  form: FormState;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  income: IncomeBreakdown;
}

export default function Section1Income({ form, updateField, income }: Props) {
  return (
    <section className="animate-fade-in">
      {/* セクション1: 収入金額等 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="bg-blue-800 text-white px-4 py-2.5">
          <h2 className="text-sm font-bold tracking-wide">収入金額等</h2>
        </div>
        <div className="px-4 py-2 divide-y divide-gray-100">
          {/* 給与 */}
          <FieldRow
            symbol="ア"
            label="給与"
            subText="給与所得控除後の金額が自動計算されます"
            resultValue={income.salaryIncome}
            resultLabel="所得金額"
          >
            <div className="flex items-center gap-2">
              <CurrencyInput
                value={form.salaryRevenue}
                onChange={v => updateField('salaryRevenue', v)}
                placeholder="給与収入金額"
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">円</span>
            </div>
          </FieldRow>

          {/* 公的年金等 */}
          <FieldRow
            symbol="イ"
            label="公的年金等"
            subText="公的年金等控除額が自動計算されます"
            resultValue={income.pensionIncome}
            resultLabel="所得金額"
          >
            <div className="flex items-center gap-2">
              <CurrencyInput
                value={form.pensionRevenue}
                onChange={v => updateField('pensionRevenue', v)}
                placeholder="年金収入金額"
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">円</span>
            </div>
            <label className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={form.pensionAge65}
                onChange={e => updateField('pensionAge65', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              65歳以上
            </label>
          </FieldRow>

          {/* 事業（営業等） */}
          <FieldRow
            symbol="ウ"
            label="事業（営業等）"
            subText="収入金額と必要経費を入力"
            resultValue={income.businessIncome}
            resultLabel="所得金額"
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-gray-500 mb-0.5">収入金額</div>
                <div className="flex items-center gap-1">
                  <CurrencyInput
                    value={form.businessRevenue}
                    onChange={v => updateField('businessRevenue', v)}
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500">円</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">必要経費</div>
                <div className="flex items-center gap-1">
                  <CurrencyInput
                    value={form.businessExpenses}
                    onChange={v => updateField('businessExpenses', v)}
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500">円</span>
                </div>
              </div>
            </div>
          </FieldRow>

          {/* 一時所得 */}
          <FieldRow
            symbol="エ"
            label="一時"
            subText="特別控除50万円・1/2課税を自動適用"
            resultValue={income.temporaryIncomeForTax}
            resultLabel="算入額(1/2)"
          >
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-xs text-gray-500 mb-0.5">総収入金額</div>
                <div className="flex items-center gap-1">
                  <CurrencyInput
                    value={form.temporaryRevenue}
                    onChange={v => updateField('temporaryRevenue', v)}
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500">円</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-0.5">支出金額</div>
                <div className="flex items-center gap-1">
                  <CurrencyInput
                    value={form.temporaryExpenses}
                    onChange={v => updateField('temporaryExpenses', v)}
                    placeholder="0"
                  />
                  <span className="text-xs text-gray-500">円</span>
                </div>
              </div>
            </div>
          </FieldRow>

          {/* その他の雑所得 */}
          <FieldRow
            symbol="オ"
            label="その他の雑所得"
            subText="所得金額を直接入力"
            resultValue={income.miscIncome}
            resultLabel="所得金額"
          >
            <div className="flex items-center gap-2">
              <CurrencyInput
                value={form.miscIncome}
                onChange={v => updateField('miscIncome', v)}
                placeholder="所得金額"
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">円</span>
            </div>
          </FieldRow>
        </div>

        {/* 所得金額等 合計 */}
        <div className="bg-blue-50 border-t border-blue-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="field-label-symbol bg-blue-700 text-white">⑫</span>
            <span className="text-sm font-bold text-blue-900">合計所得金額</span>
          </div>
          <div className="font-mono-num text-lg font-bold text-blue-900">
            {income.totalIncome.toLocaleString('ja-JP')}<span className="text-sm font-normal ml-1">円</span>
          </div>
        </div>
      </div>
    </section>
  );
}
