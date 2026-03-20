import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import DocumentListScreen from '@/components/DocumentListScreen';
import { generateInitialDocumentGroups } from '@/utils/documentUtils';
import { CategoryGroup } from '@/types';
import {
  ApiError,
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
  const [serverUpdatedAt, setServerUpdatedAt] = useState<string | null>(null);

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
        setServerUpdatedAt(data.updatedAt ?? null);
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

  // サーバーレスポンスをローカルstateに反映する共通処理
  const applyServerData = useCallback((data: { found: boolean; documentGroups: CategoryGroup[] | null; updatedAt: string | null }): boolean => {
    if (data.found && data.documentGroups) {
      setDocumentGroups(data.documentGroups);
      setServerUpdatedAt(data.updatedAt ?? null);
      setIsDirty(false);
      return true;
    }
    return false;
  }, []);

  // 保存処理（共通・楽観ロック付き）
  const performSave = useCallback(async (silent = false): Promise<boolean> => {
    if (isSavingRef.current) return false;
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await saveDocumentsByCustomerId(customerId, year, documentGroups, serverUpdatedAt);
      setIsSaving(false);
      setLastSaved(new Date());
      setIsDirty(false);
      setServerUpdatedAt(result.updatedAt ?? null);
      if (!silent) toast('データを保存しました', 'success');
      return true;
    } catch (error) {
      setIsSaving(false);
      if (error instanceof ApiError && error.status === 409) {
        setSaveError(null);
        if (silent) {
          toast('他のユーザーが変更を保存しました。手動で読み込みしてください。', 'warning');
          return false;
        }
        const shouldReload = confirm(
          '他のユーザーまたはタブで変更が保存されています。\n最新データを読み込みますか？\n\n（「OK」で最新データに更新、「キャンセル」で現在の編集を維持）'
        );
        if (shouldReload) {
          const data = await fetchDocumentsByCustomerId(customerId, year);
          applyServerData(data);
          toast('最新データを読み込みました', 'info');
        }
        return false;
      }
      setSaveError(getErrorMessage(error, '保存に失敗しました'));
      if (!silent) toast('保存に失敗しました', 'error');
      return false;
    }
  }, [customerId, year, documentGroups, serverUpdatedAt, toast, applyServerData]);

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
      if (applyServerData(data)) {
        toast('データを読み込みました', 'success');
      } else {
        toast('保存されたデータが見つかりませんでした', 'warning');
      }
    } catch {
      toast('データの読み込みに失敗しました', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [customerId, year, toast, applyServerData]);

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
        customerId={customerId}
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
