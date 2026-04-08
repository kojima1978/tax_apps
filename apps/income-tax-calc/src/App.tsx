import Header from '@/components/Header';
import Section1Income from '@/components/Section1Income';
import Section2Deductions from '@/components/Section2Deductions';
import Section3TaxCalc from '@/components/Section3TaxCalc';
import Section4Summary from '@/components/Section4Summary';
import ReferenceLinks from '@/components/ReferenceLinks';
import PrintFooter from '@/components/PrintFooter';
import { useTaxForm } from '@/hooks/useTaxForm';

export default function App() {
  const { form, updateField, result, reset } = useTaxForm();

  return (
    <div className="min-h-screen">
      <Header onReset={reset} />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* セクション1: 収入金額等 + 所得金額等 */}
        <Section1Income form={form} updateField={updateField} income={result.income} />

        {/* セクション2: 所得から差し引かれる金額 */}
        <Section2Deductions form={form} updateField={updateField} deduction={result.deduction} />

        {/* セクション3: 税金の計算 */}
        <Section3TaxCalc result={result} />

        {/* セクション4: 住民税・合計 */}
        <Section4Summary result={result} />

        <ReferenceLinks />
        <PrintFooter />
      </main>
    </div>
  );
}
