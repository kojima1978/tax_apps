import { useState, useEffect, useCallback, useRef } from 'react';
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
import { ToastContainer } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import { useAutoSave } from '@/hooks/useAutoSave';
import { useBeforeUnloadWarning } from '@/hooks/useBeforeUnloadWarning';
import { useCtrlSave } from '@/hooks/useCtrlSave';

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
  const [isDirty, setIsDirty] = useState(false);

  const { messages, toast, dismiss } = useToast();
  const isSavingRef = useRef(false);
  isSavingRef.current = isSaving;

  const handleDocumentGroupsChange = useCallback((groups: CategoryGroup[]) => {
    setDocumentGroups(groups);
    setIsDirty(true);
  }, []);

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
          setIsDirty(false);
        }
      }
    };

    loadInitialData();
    return () => { cancelled = true; };
  }, [customerId, year]);

  // 保存処理（共通）
  const performSave = useCallback(async (silent = false): Promise<boolean> => {
    if (isSavingRef.current) return false;
    setIsSaving(true);
    setSaveError(null);

    try {
      await saveDocumentsByCustomerId(customerId, year, documentGroups);
      setIsSaving(false);
      setLastSaved(new Date());
      setIsDirty(false);
      if (!silent) toast('データを保存しました', 'success');
      return true;
    } catch (error) {
      setIsSaving(false);
      setSaveError(getErrorMessage(error, '保存に失敗しました'));
      if (!silent) toast('保存に失敗しました', 'error');
      return false;
    }
  }, [customerId, year, documentGroups, toast]);

  const handleSave = useCallback(async () => { await performSave(false); }, [performSave]);

  // 自動保存・Ctrl+S・beforeunload
  useAutoSave({
    isDirty,
    isReady: !isInitialLoading,
    isSavingRef,
    onSave: () => performSave(true),
    onSuccess: () => toast('自動保存しました', 'success'),
    deps: [documentGroups, performSave, toast],
  });
  useCtrlSave(useCallback(() => {
    if (!isSavingRef.current) performSave(false);
  }, [performSave]));
  useBeforeUnloadWarning(isDirty);

  const handleLoad = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchDocumentsByCustomerId(customerId, year);
      if (data.found && data.documentGroups) {
        setDocumentGroups(data.documentGroups);
        setIsDirty(false);
        toast('データを読み込みました', 'success');
      } else {
        toast('保存されたデータが見つかりませんでした', 'warning');
      }
    } catch {
      toast('データの読み込みに失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, year, toast]);

  const handleCopyToNextYear = useCallback(async () => {
    const saved = await performSave(true);
    if (!saved) {
      toast('保存に失敗したため、翌年度更新を中止しました', 'error');
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
        toast('翌年度更新に失敗しました', 'error');
      }
    } catch {
      toast('翌年度更新に失敗しました', 'error');
    }
  }, [customerId, year, performSave, navigate, toast]);

  if (isInitialLoading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </main>
    );
  }

  return (
    <>
      <DocumentListScreen
        year={year}
        documentGroups={documentGroups}
        onDocumentGroupsChange={handleDocumentGroupsChange}
        onBack={() => {
          if (isDirty && !confirm('未保存の変更があります。破棄してよろしいですか？')) return;
          navigate(`/customers/${customerId}`);
        }}
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
      <ToastContainer messages={messages} onDismiss={dismiss} />
    </>
  );
}
