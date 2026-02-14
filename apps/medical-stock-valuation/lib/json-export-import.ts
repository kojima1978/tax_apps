import { FormData } from './types';
import { toWareki } from './date-utils';

const VALUATION_TYPE = 'valuation-data';
const VALUATION_VERSION = '1.0';
const APP_NAME = 'medical-stock-valuation';

interface ValuationExportData {
  type: typeof VALUATION_TYPE;
  version: typeof VALUATION_VERSION;
  appName: typeof APP_NAME;
  exportedAt: string;
  data: {
    fiscalYear: string;
    companyName: string;
    personInCharge: string;
    employees: string;
    totalAssets: string;
    sales: string;
    currentPeriodNetAsset: number;
    previousPeriodNetAsset: number;
    netAssetTaxValue: number;
    currentPeriodProfit: number;
    previousPeriodProfit: number;
    previousPreviousPeriodProfit: number;
    investors: Array<{ name: string; amount: number }>;
  };
}

function downloadJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string));
      } catch {
        reject(new Error('JSONの解析に失敗しました'));
      }
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
    reader.readAsText(file);
  });
}

export function exportValuationJson(formData: FormData): void {
  const exportData: ValuationExportData = {
    type: VALUATION_TYPE,
    version: VALUATION_VERSION,
    appName: APP_NAME,
    exportedAt: new Date().toISOString(),
    data: {
      fiscalYear: formData.fiscalYear || '',
      companyName: formData.companyName || '',
      personInCharge: formData.personInCharge || '',
      employees: formData.employees,
      totalAssets: formData.totalAssets,
      sales: formData.sales,
      currentPeriodNetAsset: formData.currentPeriodNetAsset,
      previousPeriodNetAsset: formData.previousPeriodNetAsset,
      netAssetTaxValue: formData.netAssetTaxValue,
      currentPeriodProfit: formData.currentPeriodProfit,
      previousPeriodProfit: formData.previousPeriodProfit,
      previousPreviousPeriodProfit: formData.previousPreviousPeriodProfit,
      investors: formData.investors,
    },
  };

  const reiwa = formData.fiscalYear ? toWareki(formData.fiscalYear) : '不明';
  const company = formData.companyName || '不明';
  const filename = `${company}_${reiwa}年度_評価データ.json`;
  downloadJson(exportData, filename);
}

export function validateValuationImport(data: unknown): FormData | null {
  if (typeof data !== 'object' || data === null) return null;
  const obj = data as Record<string, unknown>;

  if (obj.type !== VALUATION_TYPE || obj.version !== VALUATION_VERSION) return null;

  const d = obj.data as Record<string, unknown> | undefined;
  if (typeof d !== 'object' || d === null) return null;

  if (typeof d.fiscalYear !== 'string' || typeof d.companyName !== 'string') return null;
  if (!Array.isArray(d.investors)) return null;

  return {
    fiscalYear: d.fiscalYear as string,
    companyName: d.companyName as string,
    personInCharge: (d.personInCharge as string) || '',
    employees: (d.employees as string) || '',
    totalAssets: (d.totalAssets as string) || '',
    sales: (d.sales as string) || '',
    currentPeriodNetAsset: Number(d.currentPeriodNetAsset) || 0,
    previousPeriodNetAsset: Number(d.previousPeriodNetAsset) || 0,
    netAssetTaxValue: Number(d.netAssetTaxValue) || 0,
    currentPeriodProfit: Number(d.currentPeriodProfit) || 0,
    previousPeriodProfit: Number(d.previousPeriodProfit) || 0,
    previousPreviousPeriodProfit: Number(d.previousPreviousPeriodProfit) || 0,
    investors: (d.investors as Array<{ name: string; amount: number }>).map(inv => ({
      name: inv.name || '',
      amount: Number(inv.amount) || 0,
    })),
  };
}
