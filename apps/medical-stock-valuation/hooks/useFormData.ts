'use client';

import { useState, useEffect } from 'react';
import { Investor } from '@/lib/types';
import { validateFormData } from '@/lib/utils';
import { useToast } from '@/components/Toast';

/**
 * メインフォーム（page.tsx）の全状態管理フック
 * 14 useState + localStorage復元 + 出資者操作 + バリデーション + データ構築
 */
export function useFormData() {
  const toast = useToast();
  const [currentDataId, setCurrentDataId] = useState<string | undefined>(undefined);
  const [fiscalYear, setFiscalYear] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [personInCharge, setPersonInCharge] = useState('');
  const [employees, setEmployees] = useState('');
  const [totalAssets, setTotalAssets] = useState('');
  const [sales, setSales] = useState('');
  const [currentPeriodNetAsset, setCurrentPeriodNetAsset] = useState('');
  const [previousPeriodNetAsset, setPreviousPeriodNetAsset] = useState('');
  const [netAssetTaxValue, setNetAssetTaxValue] = useState('');
  const [currentPeriodProfit, setCurrentPeriodProfit] = useState('');
  const [previousPeriodProfit, setPreviousPeriodProfit] = useState('');
  const [previousPreviousPeriodProfit, setPreviousPreviousPeriodProfit] = useState('');
  const [investors, setInvestors] = useState<Investor[]>(() => [
    { name: '', amount: 0 },
    { name: '', amount: 0 },
    { name: '', amount: 0 },
  ]);

  useEffect(() => {
    try {
      const savedData = localStorage.getItem('formData');
      if (!savedData) return;
      const data = JSON.parse(savedData);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentDataId(data.id);
      setFiscalYear(data.fiscalYear || '');
      setCompanyName(data.companyName || '');
      setPersonInCharge(data.personInCharge || '');
      setEmployees(data.employees || '');
      setTotalAssets(data.totalAssets || '');
      setSales(data.sales || '');
      setCurrentPeriodNetAsset(data.currentPeriodNetAsset?.toString() || '');
      setPreviousPeriodNetAsset(data.previousPeriodNetAsset?.toString() || '');
      setNetAssetTaxValue(data.netAssetTaxValue?.toString() || '');
      setCurrentPeriodProfit(data.currentPeriodProfit?.toString() || '');
      setPreviousPeriodProfit(data.previousPeriodProfit?.toString() || '');
      setPreviousPreviousPeriodProfit(data.previousPreviousPeriodProfit?.toString() || '');
      if (data.investors?.length > 0) setInvestors(data.investors);
    } catch (error) {
      console.error('Failed to restore form data:', error);
    }
  }, []);

  const addInvestorRow = () => setInvestors([...investors, { name: '', amount: 0 }]);

  const removeInvestorRow = (index: number) => setInvestors(investors.filter((_, i) => i !== index));

  const updateInvestor = (index: number, field: keyof Investor, value: string | number) => {
    const next = [...investors];
    next[index] = { ...next[index], [field]: value };
    setInvestors(next);
  };

  const reorderInvestors = (newOrder: Investor[]) => setInvestors(newOrder);

  const totalInvestment = investors.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  const copyToTaxValue = () => {
    if (currentPeriodNetAsset) setNetAssetTaxValue(currentPeriodNetAsset);
  };

  const saveCurrentFormData = () => {
    try {
      localStorage.setItem('formData', JSON.stringify({
        ...(currentDataId ? { id: currentDataId } : {}),
        fiscalYear, companyName, personInCharge,
        employees, totalAssets, sales,
        currentPeriodNetAsset, previousPeriodNetAsset, netAssetTaxValue,
        currentPeriodProfit, previousPeriodProfit, previousPreviousPeriodProfit,
        investors,
      }));
    } catch { /* QuotaExceededError */ }
  };

  /** バリデーション + 計算用FormData構築（失敗時はnull, toast自動表示） */
  const getValidFormData = (includeId = false) => {
    const result = validateFormData({
      fiscalYear, companyName, personInCharge,
      employees, totalAssets, sales,
      currentPeriodNetAsset, netAssetTaxValue,
      currentPeriodProfit, investors,
    });
    if (!result.isValid) {
      toast.warning(result.message!);
      return null;
    }
    return {
      ...(includeId && currentDataId ? { id: currentDataId } : {}),
      fiscalYear, companyName, personInCharge,
      employees, totalAssets, sales,
      currentPeriodNetAsset: parseFloat(currentPeriodNetAsset) || 0,
      previousPeriodNetAsset: parseFloat(previousPeriodNetAsset) || 0,
      netAssetTaxValue: parseFloat(netAssetTaxValue) || 0,
      currentPeriodProfit: parseFloat(currentPeriodProfit) || 0,
      previousPeriodProfit: parseFloat(previousPeriodProfit) || 0,
      previousPreviousPeriodProfit: parseFloat(previousPreviousPeriodProfit) || 0,
      investors: result.validInvestors!,
    };
  };

  return {
    currentDataId, setCurrentDataId,
    fiscalYear, setFiscalYear, companyName, setCompanyName,
    personInCharge, setPersonInCharge,
    employees, setEmployees, totalAssets, setTotalAssets, sales, setSales,
    currentPeriodNetAsset, setCurrentPeriodNetAsset,
    previousPeriodNetAsset, setPreviousPeriodNetAsset,
    netAssetTaxValue, setNetAssetTaxValue,
    currentPeriodProfit, setCurrentPeriodProfit,
    previousPeriodProfit, setPreviousPeriodProfit,
    previousPreviousPeriodProfit, setPreviousPreviousPeriodProfit,
    investors, addInvestorRow, removeInvestorRow, updateInvestor, reorderInvestors,
    totalInvestment, copyToTaxValue,
    saveCurrentFormData, getValidFormData, toast,
  };
}
