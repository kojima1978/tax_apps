'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Trash2, X, ArrowLeft, Download } from 'lucide-react';
import Header from '@/components/Header';
import { toWareki } from '@/lib/date-utils';
import { BTN_CLASS, SMALL_BTN_CLASS, HOVER_CLASS } from '@/lib/button-styles';
import { useToast } from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';

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

export default function SavedDataPage() {
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/medical/api/valuations/');

      if (!response.ok) {
        console.error(`API Error: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.error('Response body:', text);
        throw new Error(`データの取得に失敗しました (${response.status})`);
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error('読み込みエラー:', err);
      setError('データの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const loadRecord = (record: SavedValuation) => {
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
  };

  const deleteRecord = async (id: string) => {
    try {
      const response = await fetch(`/medical/api/valuations/?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }

      toast.success('データを削除しました');
      loadData();
    } catch (err) {
      console.error('削除エラー:', err);
      toast.error('データの削除に失敗しました');
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await fetch('/medical/api/backup');
      if (!response.ok) {
        throw new Error('エクスポートに失敗しました');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().slice(0, 10);
      a.download = `medical-backup_${today}.json`;
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
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setShowImportConfirm(true);
    // inputをリセットして同じファイルを再選択可能にする
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportConfirm = async () => {
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
      if (!response.ok) {
        throw new Error(result.error || 'インポートに失敗しました');
      }
      toast.success('バックアップを復元しました');
      loadData();
    } catch (err) {
      console.error('インポートエラー:', err);
      const message = err instanceof Error ? err.message : 'インポートに失敗しました';
      toast.error(message);
    } finally {
      setImporting(false);
      setImportFile(null);
    }
  };

  const availableYears = Array.from(new Set(data.map(record => record.fiscalYear).filter(year => year && year.trim()))).sort((a, b) => b.localeCompare(a));

  const filteredData = data.filter((record) => {
    const yearMatch = !filterYear || record.fiscalYear === filterYear;
    const companyMatch = !filterCompanyName || record.companyName.toLowerCase().includes(filterCompanyName.toLowerCase());
    const personMatch = !filterPersonInCharge || record.personInCharge.toLowerCase().includes(filterPersonInCharge.toLowerCase());

    return yearMatch && companyMatch && personMatch;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    let compareA: string | number = '';
    let compareB: string | number = '';

    if (sortField === 'fiscal_year') {
      compareA = a.fiscalYear;
      compareB = b.fiscalYear;
    } else if (sortField === 'person_in_charge') {
      compareA = a.personInCharge;
      compareB = b.personInCharge;
    } else if (sortField === 'updated_at') {
      compareA = new Date(a.updated_at).getTime();
      compareB = new Date(b.updated_at).getTime();
    }

    if (compareA < compareB) {
      return sortOrder === 'asc' ? -1 : 1;
    }
    if (compareA > compareB) {
      return sortOrder === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return ' ⇅';
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  };

  if (loading) {
    return (
      <div>
        <Header />
        <h1>保存データ一覧</h1>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Header />
        <h1>保存データ一覧</h1>
        <div className="card">
          <p className="text-gray-600">{error}</p>
          <button
            className={`${BTN_CLASS} ${HOVER_CLASS} mt-4`}
            onClick={() => router.push('/')}
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header />
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <h1 className="mb-0">保存データ一覧</h1>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            className={`${SMALL_BTN_CLASS} ${HOVER_CLASS}`}
          >
            <Download size={16} />
            {exporting ? 'エクスポート中...' : 'バックアップ'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className={`${SMALL_BTN_CLASS} ${HOVER_CLASS}`}
          >
            <Upload size={16} />
            {importing ? '復元中...' : '復元'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      {data.length === 0 ? (
        <div className="card">
          <p className="mb-4">保存されたデータはありません。</p>
          <button
            className={`${BTN_CLASS} ${HOVER_CLASS}`}
            onClick={() => router.push('/')}
          >
            入力画面へ
          </button>
        </div>
      ) : (
        <>
          <div className="card">
            <h2 className="mt-0">絞り込み</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">年度</label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                >
                  <option value="">すべて</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year}>
                      {toWareki(year)}年度
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">会社名</label>
                <input
                  type="text"
                  placeholder="会社名で検索"
                  value={filterCompanyName}
                  onChange={(e) => setFilterCompanyName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">担当者</label>
                <input
                  type="text"
                  placeholder="担当者名で検索"
                  value={filterPersonInCharge}
                  onChange={(e) => setFilterPersonInCharge(e.target.value)}
                />
              </div>
            </div>
            {(filterYear || filterCompanyName || filterPersonInCharge) && (
              <div className="mt-4 flex items-center gap-3">
                <span className="text-sm text-gray-600">
                  {filteredData.length}件 / {data.length}件中
                </span>
                <button
                  onClick={() => {
                    setFilterYear('');
                    setFilterCompanyName('');
                    setFilterPersonInCharge('');
                  }}
                  className={`${SMALL_BTN_CLASS} ${HOVER_CLASS}`}
                >
                  <X size={16} />
                  クリア
                </button>
              </div>
            )}
          </div>

          <div className="card">
            <table>
              <thead>
                <tr>
                  <th className="text-left">会社名</th>
                  <th
                    className="text-center cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('fiscal_year')}
                  >
                    年度{getSortIndicator('fiscal_year')}
                  </th>
                  <th
                    className="text-left cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('person_in_charge')}
                  >
                    担当者{getSortIndicator('person_in_charge')}
                  </th>
                  <th
                    className="text-center cursor-pointer hover:bg-gray-200"
                    onClick={() => handleSort('updated_at')}
                  >
                    更新日時{getSortIndicator('updated_at')}
                  </th>
                  <th className="text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {sortedData.map((record) => (
                  <tr key={record.id}>
                    <td className="text-left">{record.companyName}</td>
                    <td className="text-center">{toWareki(record.fiscalYear)}年度</td>
                    <td className="text-left">{record.personInCharge}</td>
                    <td className="text-center">
                      {new Date(record.updated_at).toLocaleString('ja-JP')}
                    </td>
                    <td className="text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => loadRecord(record)}
                          className={`${SMALL_BTN_CLASS} ${HOVER_CLASS}`}
                        >
                          <Upload size={16} />
                          読込
                        </button>
                        <button
                          onClick={() => setDeleteTargetId(record.id)}
                          className={`${SMALL_BTN_CLASS} ${HOVER_CLASS}`}
                        >
                          <Trash2 size={16} />
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6">
            <button
              onClick={() => router.push('/')}
              className={`${BTN_CLASS} ${HOVER_CLASS}`}
            >
              <ArrowLeft size={20} />
              入力画面へ戻る
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        onConfirm={() => {
          if (deleteTargetId) {
            deleteRecord(deleteTargetId);
          }
          setDeleteTargetId(null);
        }}
        onCancel={() => setDeleteTargetId(null)}
        title="削除の確認"
        message="このデータを削除しますか？"
      />

      <ConfirmDialog
        isOpen={showImportConfirm}
        onConfirm={handleImportConfirm}
        onCancel={() => {
          setShowImportConfirm(false);
          setImportFile(null);
        }}
        title="復元の確認"
        message={"既存データを全て置換しますがよろしいですか？\nこの操作は取り消せません。"}
      />
    </div>
  );
}
