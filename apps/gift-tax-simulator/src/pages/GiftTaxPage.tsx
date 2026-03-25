import PageLayout from '@/components/PageLayout';
import InputSection from '@/components/InputSection';
import ResultSection from '@/components/ResultSection';
import { useGiftTaxForm } from '@/hooks/useGiftTaxForm';

export default function GiftTaxPage() {
  const form = useGiftTaxForm();

  return (
    <PageLayout>
      <InputSection
        amount={form.amount}
        setAmount={form.setAmount}
        giftType={form.giftType}
        setGiftType={form.setGiftType}
        onCalculate={form.handleCalculate}
        errorMsg={form.errorMsg}
      />
      <ResultSection results={form.results} giftType={form.giftType} />
    </PageLayout>
  );
}
