import { useState } from 'react';
import type { HeirComposition, SpouseAcquisitionMode } from '../types';
import { createDefaultComposition } from '../constants';

/**
 * Insurance / CashGift ページ共通の基本state群。
 */
export function useSimulationBase() {
  const [composition, setComposition] = useState<HeirComposition>(createDefaultComposition);
  const [estateValue, setEstateValue] = useState<number>(0);
  const [spouseMode, setSpouseMode] = useState<SpouseAcquisitionMode>({ mode: 'legal' });

  return { composition, setComposition, estateValue, setEstateValue, spouseMode, setSpouseMode };
}
