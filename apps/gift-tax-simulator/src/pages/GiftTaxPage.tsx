import Navigation from '@/components/Navigation';
import InputSection from '@/components/InputSection';
import ResultSection from '@/components/ResultSection';
import PrintFooter from '@/components/PrintFooter';
import { useGiftTaxForm } from '@/hooks/useGiftTaxForm';

export default function GiftTaxPage() {
  const form = useGiftTaxForm();

  return (
    <div className="container-custom">
      <Navigation />
      <InputSection
        amount={form.amount}
        setAmount={form.setAmount}
        giftType={form.giftType}
        setGiftType={form.setGiftType}
        onCalculate={form.handleCalculate}
        errorMsg={form.errorMsg}
      />
      <ResultSection results={form.results} />
      <PrintFooter />
    </div>
  );
}
