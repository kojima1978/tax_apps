'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, FileText, Calculator } from 'lucide-react';
import { FormData, CalculationResult } from '@/lib/types';
import { calculateEvaluation } from '@/lib/calculations';
import { useSaveValuation } from '@/hooks/useSaveValuation';
import { validateBasicInfo, formatSen } from '@/lib/utils';
import { toWareki } from '@/lib/date-utils';
import { BTN_CLASS, HOVER_CLASS } from '@/lib/button-styles';
import CalculationDetailsModal from '@/components/CalculationDetailsModal';
import { useToast } from '@/components/Toast';

const CALC_BTN_CLASS = "ml-2 px-2 py-1 text-xs bg-white text-black border border-gray-300 rounded hover:bg-gray-200 hover:border-gray-400 cursor-pointer transition-colors flex items-center gap-1";

function CalculationProcessButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={CALC_BTN_CLASS} title="計算過程を表示">
      <Calculator size={14} />
      計算過程
    </button>
  );
}

export default function Results() {
  const router = useRouter();
  const toast = useToast();
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);
  const { saveOverwrite } = useSaveValuation();
  const [modalOpen, setModalOpen] = useState<'similar' | 'netAsset' | 'perShare' | null>(null);

  useEffect(() => {
    const loadDataAndCalculate = async () => {
      let savedData: string | null = null;
      try { savedData = localStorage.getItem('formData'); } catch { /* private browsing */ }
      if (savedData) {
        const data: FormData = JSON.parse(savedData);

        if (data.fiscalYear) {
          try {
            const response = await fetch(`/medical/api/similar-industry?fiscalYear=${data.fiscalYear}`);
            if (response.ok) {
              data.similarIndustryData = await response.json();
            }
          } catch (error) {
            console.error('類似業種データの取得に失敗:', error);
          }
        }

        setFormData(data);

        try {
          setResult(calculateEvaluation(data));
        } catch (error) {
          console.error('Calculation error:', error);
        }
      }
    };

    loadDataAndCalculate();
  }, []);

  const saveToDatabase = async () => {
    if (!formData) {
      toast.warning('保存するデータがありません');
      return;
    }

    const validation = validateBasicInfo({
      fiscalYear: formData.fiscalYear,
      companyName: formData.companyName,
      personInCharge: formData.personInCharge
    });

    if (!validation.isValid) {
      toast.warning('STEP0の基本情報が不足しています。入力画面に戻って入力してください');
      return;
    }

    const saveResult = await saveOverwrite(formData);
    if (saveResult.success) {
      toast.success('データをデータベースに保存しました');
      try {
        const savedData = localStorage.getItem('formData');
        if (savedData) {
          setFormData(JSON.parse(savedData));
        }
      } catch { /* ignore */ }
    } else {
      toast.error('データの保存に失敗しました。再度お試しください');
    }
  };

  if (!result || !formData) {
    return (
      <div>
        <p>データを読み込んでいます...</p>
      </div>
    );
  }

  return (
    <div>
      <h1>評価額の概算（計算結果）</h1>

      <div className="card">
        <h2 className="mt-0">1．出資持分評価額・持分なし医療法人移行時のみなし贈与税額</h2>

        <div className="flex justify-between items-center gap-4">
          <div className="flex-1 text-center">
            <div className="text-lg font-bold mb-3">設立時</div>
            <div className="mb-3">
              <img src="/doctor.svg" alt="医療法人" className="mx-auto" width="120" height="80" />
            </div>
            <div className="font-bold mb-2">当初出資額</div>
            <div className="inline-block bg-blue-100 rounded-full px-6 py-3 text-lg font-bold">
              {formatSen(result.totalCapital)}
            </div>
          </div>

          <div className="text-blue-500 text-4xl">→</div>

          <div className="flex-1 text-center">
            <div className="text-lg font-bold mb-3">現在（持分あり医療法人）</div>
            <div className="mb-3">
              <img src="/hospital.svg" alt="医療法人" className="mx-auto" width="120" height="80" />
            </div>
            <div className="font-bold mb-2">出資持分評価額</div>
            <div className="inline-block bg-blue-100 rounded-full px-6 py-3 text-lg font-bold">
              {formatSen(result.totalEvaluationValue)}
            </div>
          </div>

          <div className="text-blue-400 text-4xl">→</div>

          <div className="flex-1 text-center">
            <div className="text-lg font-bold mb-3">移行後（持分なし医療法人）</div>
            <div className="mb-3">
              <img src="/hospital2.svg" alt="医療法人" className="mx-auto" width="120" height="80" />
            </div>
            <div className="font-bold mb-2">みなし贈与税額</div>
            <div className="inline-block bg-blue-100 rounded-full px-6 py-3 text-lg font-bold">
              {formatSen(result.deemedGiftTax)}
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 mt-4 text-center">
          ※全出資者がすべての持分を放棄した場合の、医療法人へのみなし贈与税額の試算です。
        </p>
      </div>

      <div className="card">
        <h2 className="mt-0">2．各出資者の出資持分評価額</h2>
        <table>
          <thead>
            <tr>
              <th className="text-center">№</th>
              <th className="text-left">出資者名</th>
              <th className="text-right">出資金額</th>
              <th className="text-right">出資持分評価額</th>
              <th className="text-right">贈与税額</th>
            </tr>
          </thead>
          <tbody>
            {result.investorResults.map((investor, index) => (
              <tr key={index}>
                <td className="text-center">{index + 1}</td>
                <td className="text-left">{investor.name || ''}</td>
                <td className="text-right">{formatSen(Math.round((investor.amount || 0) / 1000))}</td>
                <td className="text-right">{formatSen(investor.evaluationValue || 0)}</td>
                <td className="text-right">{formatSen(investor.giftTax || 0)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold">
              <td className="text-center">合計</td>
              <td></td>
              <td className="text-right">
                {formatSen(Math.round(formData.investors.reduce((sum, inv) => sum + (inv.amount || 0), 0) / 1000))}
              </td>
              <td className="text-right">
                {formatSen(result.investorResults.reduce((sum, inv) => sum + (inv.evaluationValue || 0), 0))}
              </td>
              <td className="text-right">
                {formatSen(result.investorResults.reduce((sum, inv) => sum + (inv.giftTax || 0), 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="card">
        <h2 className="mt-0">（参考）出資持分評価額を算定する上での各要素</h2>
        <table>
          <thead>
            <tr>
              <th className="text-left">項目</th>
              <th className="text-right">対象法人</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>会社規模</td>
              <td className="text-right">{result.companySize}</td>
            </tr>
            <tr>
              <td>特定の評価会社の該当判定</td>
              <td className="text-right">{result.specialCompanyType}</td>
            </tr>
            <tr>
              <td>出資金額総額</td>
              <td className="text-right">{formatSen(result.totalCapital)}</td>
            </tr>
            <tr>
              <td>総出資口数（1口50円と仮定）</td>
              <td className="text-right">{result.totalShares.toLocaleString('ja-JP')}口</td>
            </tr>
            <tr>
              <td>出資持分の相続税評価額</td>
              <td className="text-right">{formatSen(result.inheritanceTaxValue)}</td>
            </tr>
            <tr>
              <td>持分なし医療法人移行時のみなし贈与税額</td>
              <td className="text-right">{formatSen(result.deemedGiftTax)}</td>
            </tr>
            <tr>
              <td className="flex items-center justify-between">
                <span>1口あたりの類似業種比準価額方式による評価額</span>
                <CalculationProcessButton onClick={() => setModalOpen('similar')} />
              </td>
              <td className="text-right">{result.perShareSimilarIndustryValue.toLocaleString('ja-JP')}円</td>
            </tr>
            <tr>
              <td className="pl-6">類似業種の{formData?.fiscalYear ? `${toWareki(formData.fiscalYear)}年度` : '令和6年度'}平均株価</td>
              <td className="text-right">
                {formData?.similarIndustryData?.average_stock_price ?? 532}円
              </td>
            </tr>
            <tr>
              <td className="pl-6">類似業種の利益</td>
              <td className="text-right">
                {formData?.similarIndustryData?.profit_per_share ?? 51}円
              </td>
            </tr>
            <tr>
              <td className="pl-6">類似業種の純資産</td>
              <td className="text-right">
                {formData?.similarIndustryData?.net_asset_per_share ?? 395}円
              </td>
            </tr>
            <tr>
              <td className="flex items-center justify-between">
                <span>1口あたりの純資産価額方式による評価額</span>
                <CalculationProcessButton onClick={() => setModalOpen('netAsset')} />
              </td>
              <td className="text-right">{result.perShareNetAssetValue.toLocaleString('ja-JP')}円</td>
            </tr>
            <tr>
              <td>L値（併用割合）</td>
              <td className="text-right">{result.lRatio.toFixed(2)}</td>
            </tr>
            <tr>
              <td>評価方式</td>
              <td className="text-right">{result.evaluationMethod}</td>
            </tr>
            <tr>
              <td className="flex items-center justify-between">
                <span>1口あたりの評価額</span>
                <CalculationProcessButton onClick={() => setModalOpen('perShare')} />
              </td>
              <td className="text-right">{result.perShareValue.toLocaleString('ja-JP')}円</td>
            </tr>
          </tbody>
        </table>

        <p className="text-sm text-gray-600 mt-4">
          ※ 類似業種の株価等は、選択した年度に対応するデータを使用しています。データがない場合はデフォルト値（令和6年度）を使用します。
        </p>
      </div>

      <div className="flex justify-center gap-4">
        <button onClick={() => router.back()} className={`${BTN_CLASS} ${HOVER_CLASS}`}>
          <ArrowLeft size={20} />
          入力画面に戻る
        </button>
        <button onClick={saveToDatabase} className={`${BTN_CLASS} ${HOVER_CLASS}`}>
          <Save size={20} />
          保存
        </button>
        <button onClick={() => router.push('/gift-tax-table')} className={`${BTN_CLASS} ${HOVER_CLASS}`}>
          <FileText size={20} />
          相続税額早見表を見る
        </button>
      </div>

      {modalOpen && formData && (
        <CalculationDetailsModal
          isOpen={true}
          onClose={() => setModalOpen(null)}
          type={modalOpen}
          formData={formData}
          totalShares={result.totalShares}
          sizeMultiplier={result.companySize === '大会社' ? 0.7 : result.companySize.includes('中会社') ? 0.6 : 0.5}
          result={result}
        />
      )}
    </div>
  );
}
