import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { type GiftType } from '@/lib/tax-calculation';

interface GiftInputContextValue {
  amount: string;
  giftType: GiftType;
  /** 直近の入力で計算が成立しているか（ページ遷移時に結果を復元するかの判定に使う） */
  isCalculated: boolean;
  setAmount: (value: string) => void;
  setGiftType: (value: GiftType) => void;
  markCalculated: () => void;
  resetInput: () => void;
}

const GiftInputContext = createContext<GiftInputContextValue | null>(null);

/**
 * 贈与金額と贈与区分をページ間で共有する。
 *
 * 同じ案件で「贈与税 → 年数比較」と回遊するのが通常の使い方なので、
 * ページごとに state を持つと毎回打ち直しになる上、区分だけが片方に残って
 * 条件違いの2画面を並べてしまう事故が起きる。案件単位の入力なので
 * localStorage には残さず、リロードで白紙に戻す。
 */
export const GiftInputProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [amount, setAmountState] = useState('');
  const [giftType, setGiftTypeState] = useState<GiftType>('special');
  const [isCalculated, setIsCalculated] = useState(false);

  const setAmount = useCallback((value: string) => {
    setAmountState(value);
    setIsCalculated(false);
  }, []);

  const setGiftType = useCallback((value: GiftType) => {
    setGiftTypeState(value);
    setIsCalculated(false);
  }, []);

  const markCalculated = useCallback(() => setIsCalculated(true), []);

  const resetInput = useCallback(() => {
    setAmountState('');
    setGiftTypeState('special');
    setIsCalculated(false);
  }, []);

  const value = useMemo(
    () => ({ amount, giftType, isCalculated, setAmount, setGiftType, markCalculated, resetInput }),
    [amount, giftType, isCalculated, setAmount, setGiftType, markCalculated, resetInput],
  );

  return <GiftInputContext.Provider value={value}>{children}</GiftInputContext.Provider>;
};

export function useGiftInput(): GiftInputContextValue {
  const ctx = useContext(GiftInputContext);
  if (!ctx) throw new Error('useGiftInput must be used within GiftInputProvider');
  return ctx;
}
