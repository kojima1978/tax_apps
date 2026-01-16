'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, Trash2, X, ArrowLeft } from 'lucide-react';
import Header from '@/components/Header';
import { toWareki } from '@/lib/date-utils';
import { buttonStyle, smallButtonStyle, btnHoverClass } from '@/lib/button-styles';
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/valuations');

      if (!response.ok) {
        throw new Error('データの取得に失敗しました');
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

    // localStorageに保存
    localStorage.setItem('formData', JSON.stringify(formData));

    // トップページへ遷移
    router.push('/');
  };

  const deleteRecord = async (id: string) => {
    if (!confirm('このデータを削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/valuations?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }

      toast.success('データを削除しました');
      loadData(); // リロード
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
            className={`${btnHoverClass} mt-4`}
            style={buttonStyle}
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
      <h1>保存データ一覧</h1>

      {data.length === 0 ? (
        <div className="card">
          <p className="mb-4">保存されたデータはありません。</p>
          <button
            className={btnHoverClass}
            style={buttonStyle}
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
                  className={btnHoverClass}
                  style={smallButtonStyle}
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
                          className={btnHoverClass}
                          style={smallButtonStyle}
                        >
                          <Upload size={16} />
                          読込
                        </button>
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className={btnHoverClass}
                          style={smallButtonStyle}
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
              className={btnHoverClass}
              style={buttonStyle}
            >
              <ArrowLeft size={20} />
              入力画面へ戻る
            </button>
          </div>
        </>
      )}
    </div>
  );
}
