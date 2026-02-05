"use client";

import { useState, useCallback } from 'react';
import Header from '@/components/Header';
import InputSection from '@/components/InputSection';
import ResultSection from '@/components/ResultSection';
import { calculateAllPatterns, type GiftType, type CalculationResult } from '@/lib/tax-calculation';
import { normalizeNumberString } from '@/lib/utils';

export default function Home() {
  const [amount, setAmount] = useState('');
  const [giftType, setGiftType] = useState<GiftType>('special');
  const [results, setResults] = useState<CalculationResult[] | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCalculate = useCallback(() => {
    setErrorMsg('');
    const rawAmount = normalizeNumberString(amount);
    const amountVal = parseInt(rawAmount, 10);

    if (!amountVal || amountVal <= 0) {
      setErrorMsg('※贈与金額を正しく入力してください。');
      setResults(null);
      return;
    }

    setResults(calculateAllPatterns(amountVal, giftType));
  }, [amount, giftType]);

  return (
    <div className="container-custom">
      <Header />
      <InputSection
        amount={amount}
        setAmount={setAmount}
        giftType={giftType}
        setGiftType={setGiftType}
        onCalculate={handleCalculate}
        errorMsg={errorMsg}
      />
      <ResultSection results={results} />
    </div>
  );
}
