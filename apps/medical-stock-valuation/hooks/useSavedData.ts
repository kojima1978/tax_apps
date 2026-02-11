import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';

type SavedValuation = {
  id: string;
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
  created_at: string;
  updated_at: string;
};

type SortField = 'fiscal_year' | 'person_in_charge' | 'updated_at';
type SortOrder = 'asc' | 'desc';

export function useSavedData() {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<SavedValuation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterYear, setFilterYear] = useState('');
  const [filterCompanyName, setFilterCompanyName] = useState('');
  const [filterPersonInCharge, setFilterPersonInCharge] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/medical/api/valuations/');
      if (!response.ok) {
        console.error(`API Error: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.error('Response body:', text);
        throw new Error(`データの取得に失敗しました (${response.status})`);
      }
      setData(await response.json());
    } catch (err) {
      console.error('読み込みエラー:', err);
      setError('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const loadRecord = useCallback((record: SavedValuation) => {
    const formData = {
      id: record.id,
      fiscalYear: record.fiscalYear,
      companyName: record.companyName,
      personInCharge: record.personInCharge,
      employees: record.employees,
      totalAssets: record.totalAssets,
      sales: record.sales,
      currentPeriodNetAsset: record.currentPeriodNetAsset,
      previousPeriodNetAsset: record.previousPeriodNetAsset,
      netAssetTaxValue: record.netAssetTaxValue,
      currentPeriodProfit: record.currentPeriodProfit,
      previousPeriodProfit: record.previousPeriodProfit,
      previousPreviousPeriodProfit: record.previousPreviousPeriodProfit,
      investors: typeof record.investors === 'string' ? JSON.parse(record.investors) : record.investors,
    };
    localStorage.setItem('formData', JSON.stringify(formData));
    router.push('/');
  }, [router]);

  const deleteRecord = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/medical/api/valuations/?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('削除に失敗しました');
      toast.success('データを削除しました');
      loadData();
    } catch (err) {
      console.error('削除エラー:', err);
      toast.error('データの削除に失敗しました');
    }
  }, [toast, loadData]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  }, [sortField]);

  const handleExport = useCallback(async () => {
    try {
      setExporting(true);
      const response = await fetch('/medical/api/backup');
      if (!response.ok) throw new Error('エクスポートに失敗しました');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medical-backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('バックアップをエクスポートしました');
    } catch (err) {
      console.error('エクスポートエラー:', err);
      toast.error('バックアップのエクスポートに失敗しました');
    } finally {
      setExporting(false);
    }
  }, [toast]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setShowImportConfirm(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleImportConfirm = useCallback(async () => {
    if (!importFile) return;
    setShowImportConfirm(false);
    try {
      setImporting(true);
      const text = await importFile.text();
      const json = JSON.parse(text);
      const response = await fetch('/medical/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'インポートに失敗しました');
      toast.success('バックアップを復元しました');
      loadData();
    } catch (err) {
      console.error('インポートエラー:', err);
      toast.error(err instanceof Error ? err.message : 'インポートに失敗しました');
    } finally {
      setImporting(false);
      setImportFile(null);
    }
  }, [importFile, toast, loadData]);

  const cancelImport = useCallback(() => {
    setShowImportConfirm(false);
    setImportFile(null);
  }, []);

  const confirmDelete = useCallback(() => {
    if (deleteTargetId) deleteRecord(deleteTargetId);
    setDeleteTargetId(null);
  }, [deleteTargetId, deleteRecord]);

  const availableYears = useMemo(() =>
    Array.from(new Set(data.map(r => r.fiscalYear).filter(y => y && y.trim()))).sort((a, b) => b.localeCompare(a)),
    [data]
  );

  const filteredData = useMemo(() =>
    data.filter((record) => {
      const yearMatch = !filterYear || record.fiscalYear === filterYear;
      const companyMatch = !filterCompanyName || record.companyName.toLowerCase().includes(filterCompanyName.toLowerCase());
      const personMatch = !filterPersonInCharge || record.personInCharge.toLowerCase().includes(filterPersonInCharge.toLowerCase());
      return yearMatch && companyMatch && personMatch;
    }),
    [data, filterYear, filterCompanyName, filterPersonInCharge]
  );

  const sortedData = useMemo(() =>
    [...filteredData].sort((a, b) => {
      let compareA: string | number = '';
      let compareB: string | number = '';
      if (sortField === 'fiscal_year') { compareA = a.fiscalYear; compareB = b.fiscalYear; }
      else if (sortField === 'person_in_charge') { compareA = a.personInCharge; compareB = b.personInCharge; }
      else if (sortField === 'updated_at') { compareA = new Date(a.updated_at).getTime(); compareB = new Date(b.updated_at).getTime(); }
      if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    }),
    [filteredData, sortField, sortOrder]
  );

  const getSortIndicator = useCallback((field: SortField) => {
    if (sortField !== field) return ' ⇅';
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  }, [sortField, sortOrder]);

  const clearFilters = useCallback(() => {
    setFilterYear('');
    setFilterCompanyName('');
    setFilterPersonInCharge('');
  }, []);

  const hasFilters = filterYear || filterCompanyName || filterPersonInCharge;

  return {
    data, loading, error, sortedData, filteredData, availableYears,
    filterYear, setFilterYear,
    filterCompanyName, setFilterCompanyName,
    filterPersonInCharge, setFilterPersonInCharge,
    hasFilters, clearFilters,
    exporting, importing, fileInputRef,
    deleteTargetId, setDeleteTargetId, confirmDelete,
    showImportConfirm, handleImportConfirm, cancelImport,
    loadRecord, handleSort, getSortIndicator,
    handleExport, handleFileSelect,
    goToInput: () => router.push('/'),
    triggerFileInput: () => fileInputRef.current?.click(),
  };
}
