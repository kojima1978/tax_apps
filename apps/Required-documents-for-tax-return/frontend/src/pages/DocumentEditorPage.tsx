import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import DocumentListScreen from '@/components/DocumentListScreen';
import { generateInitialDocumentGroups } from '@/utils/documentUtils';
import { CategoryGroup } from '@/types';
import {
  fetchCustomerById,
  fetchDocumentsByCustomerId,
  saveDocumentsByCustomerId,
  copyToNextYearByCustomerId,
} from '@/utils/api';
import { getErrorMessage } from '@/utils/error';
import { formatReiwaYear } from '@/utils/date';

export default function DocumentEditorPage() {
  const { id, year: yearParam } = useParams<{ id: string; year: string }>();
  const navigate = useNavigate();
  const customerId = Number(id);
  const year = Number(yearParam);

  const [customerName, setCustomerName] = useState('');
  const [staffName, setStaffName] = useState('');
  const [documentGroups, setDocumentGroups] = useState<CategoryGroup[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 初期データ読み込み
  useEffect(() => {
    if (isNaN(customerId) || isNaN(year)) return;

    let cancelled = false;

    const loadInitialData = async () => {
      setIsInitialLoading(true);
      try {
        const customer = await fetchCustomerById(customerId);
        if (cancelled) return;
        setCustomerName(customer.customer_name);
        setStaffName(customer.staff_name || '');

        const data = await fetchDocumentsByCustomerId(customerId, year);
        if (cancelled) return;
        setDocumentGroups(
          data.found && data.documentGroups
            ? data.documentGroups
            : generateInitialDocumentGroups(year)
        );
      } catch {
        if (!cancelled) {
          setDocumentGroups(generateInitialDocumentGroups(year));
        }
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      }
    };

    loadInitialData();
    return () => { cancelled = true; };
  }, [customerId, year]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      await saveDocumentsByCustomerId(customerId, year, documentGroups);
      setIsSaving(false);
      setLastSaved(new Date());
      alert('データを保存しました');
    } catch (error) {
      setIsSaving(false);
      setSaveError(getErrorMessage(error, '保存に失敗しました'));
    }
  }, [customerId, year, documentGroups]);

  const handleLoad = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchDocumentsByCustomerId(customerId, year);
      if (data.found && data.documentGroups) {
        setDocumentGroups(data.documentGroups);
        alert('データを読み込みました');
      } else {
        alert('保存されたデータが見つかりませんでした');
      }
    } catch {
      alert('データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, year]);

  const handleCopyToNextYear = useCallback(async () => {
    // まず保存
    setIsSaving(true);
    setSaveError(null);
    try {
      await saveDocumentsByCustomerId(customerId, year, documentGroups);
      setIsSaving(false);
      setLastSaved(new Date());
    } catch (error) {
      setIsSaving(false);
      setSaveError(getErrorMessage(error, '保存に失敗しました'));
      alert('保存に失敗したため、翌年度更新を中止しました');
      return;
    }

    try {
      const data = await copyToNextYearByCustomerId(customerId, year);
      if (data.success) {
        const nextYear = year + 1;
        const switchYear = confirm(
          `${formatReiwaYear(year)}のデータを${formatReiwaYear(nextYear)}にコピーしました。\n\n対象年度を${formatReiwaYear(nextYear)}に切り替えますか？`
        );
        if (switchYear) {
          navigate(`/customers/${customerId}/years/${nextYear}`);
        }
      } else {
        alert('翌年度更新に失敗しました');
      }
    } catch {
      alert('翌年度更新に失敗しました');
    }
  }, [customerId, year, documentGroups, navigate]);

  if (isInitialLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </main>
    );
  }

  return (
    <DocumentListScreen
      year={year}
      documentGroups={documentGroups}
      onDocumentGroupsChange={setDocumentGroups}
      onBack={() => navigate(`/customers/${customerId}`)}
      customerName={customerName}
      staffName={staffName}
      onSave={handleSave}
      onLoad={handleLoad}
      onCopyToNextYear={handleCopyToNextYear}
      isSaving={isSaving}
      isLoading={isLoading}
      lastSaved={lastSaved}
      saveError={saveError}
    />
  );
}
