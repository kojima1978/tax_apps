'use client';

import { ArrowLeft, Printer, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { taxReturnData, DocumentGroup, replaceYearPlaceholder } from '@/data/taxReturnData';

interface ResultScreenProps {
  isFullListMode: boolean;
  selectedOptions: Record<string, boolean>;
  selectedDeductions: Record<string, boolean>;
  onBack: () => void;
  onReset: () => void;
  year: number;
  companyNames: string[];
  lifeInsuranceCompanies: string[];
  earthquakeInsuranceCompanies: string[];
  bankNames: string[];
  medicalBankNames: string[];
  realEstateBankNames: string[];
}

function generateResultList(
  isFullListMode: boolean,
  selectedOptions: Record<string, boolean>,
  selectedDeductions: Record<string, boolean>,
  year: number,
  companyNames: string[],
  lifeInsuranceCompanies: string[],
  earthquakeInsuranceCompanies: string[],
  bankNames: string[],
  medicalBankNames: string[],
  realEstateBankNames: string[]
): DocumentGroup[] {
  const results: DocumentGroup[] = [];

  // 1. 基本書類
  taxReturnData.baseRequired.forEach((group) => {
    results.push({
      category: group.category,
      documents: group.documents.map((doc) => replaceYearPlaceholder(doc, year)),
      note: group.note,
    });
  });

  // 2. 所得の種類別
  taxReturnData.options.forEach((opt) => {
    if (isFullListMode || selectedOptions[opt.id]) {
      // 給与・年金の場合、会社名を反映
      if (opt.id === 'salary_pension' && companyNames.length > 0) {
        const documents: string[] = [];

        // 各会社ごとに源泉徴収票を追加
        companyNames.forEach((company) => {
          documents.push(`給与所得の源泉徴収票（令和${year}年分）【${company}】`);
        });

        // 会社名が入力されていない源泉徴収票以外の書類を追加
        opt.documents.forEach((doc) => {
          const replacedDoc = replaceYearPlaceholder(doc, year);
          if (!replacedDoc.includes('給与所得の源泉徴収票')) {
            documents.push(replacedDoc);
          }
        });

        results.push({
          category: `【所得】${opt.label.replace(/ですか？|ますか？|ありますか？|ありましたか？/g, '')}`,
          documents,
        });
      // 一般事業の場合、銀行名を反映
      } else if (opt.id === 'business_general' && bankNames.length > 0) {
        const documents: string[] = [];

        opt.documents.forEach((doc) => {
          const replacedDoc = replaceYearPlaceholder(doc, year);
          // 通帳のコピーの場合は銀行名を反映
          if (replacedDoc.includes('通帳のコピー')) {
            bankNames.forEach((bank) => {
              documents.push(`通帳のコピー（事業用口座）【${bank}】`);
            });
          } else {
            documents.push(replacedDoc);
          }
        });

        results.push({
          category: `【所得】${opt.label.replace(/ですか？|ますか？|ありますか？|ありましたか？/g, '')}`,
          documents,
        });
      // 医業の場合、銀行名を反映
      } else if (opt.id === 'business_medical' && medicalBankNames.length > 0) {
        const documents: string[] = [];

        opt.documents.forEach((doc) => {
          const replacedDoc = replaceYearPlaceholder(doc, year);
          // 通帳コピーの場合は銀行名を反映
          if (replacedDoc.includes('通帳コピー')) {
            medicalBankNames.forEach((bank) => {
              documents.push(`通帳コピー【${bank}】`);
            });
          } else {
            documents.push(replacedDoc);
          }
        });

        results.push({
          category: `【所得】${opt.label.replace(/ですか？|ますか？|ありますか？|ありましたか？/g, '')}`,
          documents,
        });
      // 不動産収入の場合、銀行名を反映
      } else if (opt.id === 'real_estate' && realEstateBankNames.length > 0) {
        const documents: string[] = [];

        opt.documents.forEach((doc) => {
          const replacedDoc = replaceYearPlaceholder(doc, year);
          // 不動産所得用の通帳コピーの場合は銀行名を反映
          if (replacedDoc.includes('通帳コピー')) {
            realEstateBankNames.forEach((bank) => {
              documents.push(`不動産所得用の通帳コピー【${bank}】`);
            });
          } else {
            documents.push(replacedDoc);
          }
        });

        results.push({
          category: `【所得】${opt.label.replace(/ですか？|ますか？|ありますか？|ありましたか？/g, '')}`,
          documents,
        });
      } else {
        results.push({
          category: `【所得】${opt.label.replace(/ですか？|ますか？|ありますか？|ありましたか？/g, '')}`,
          documents: opt.documents.map((doc) => replaceYearPlaceholder(doc, year)),
        });
      }
    }
  });

  // 3. 控除項目
  taxReturnData.deductions.forEach((ded) => {
    if (isFullListMode || selectedDeductions[ded.id]) {
      // 保険控除の場合、保険会社名を反映
      if (ded.id === 'insurance' && (lifeInsuranceCompanies.length > 0 || earthquakeInsuranceCompanies.length > 0)) {
        const documents: string[] = [];

        // 生命保険会社ごとに証明書を追加
        if (lifeInsuranceCompanies.length > 0) {
          lifeInsuranceCompanies.forEach((company) => {
            documents.push(`生命保険料控除証明書【${company}】`);
          });
        } else {
          documents.push('生命保険料控除証明書');
        }

        // 地震保険会社ごとに証明書を追加
        if (earthquakeInsuranceCompanies.length > 0) {
          earthquakeInsuranceCompanies.forEach((company) => {
            documents.push(`地震（損害）保険料控除証明書【${company}】`);
          });
        } else {
          documents.push('地震（損害）保険料控除証明書');
        }

        // その他の書類を追加
        ded.documents.forEach((doc) => {
          const replacedDoc = replaceYearPlaceholder(doc, year);
          if (!replacedDoc.includes('生命保険料控除証明書') && !replacedDoc.includes('地震（損害）保険料控除証明書')) {
            documents.push(replacedDoc);
          }
        });

        results.push({
          category: `【控除】${ded.label.replace(/ですか？|ますか？/g, '')}`,
          documents,
        });
      } else {
        results.push({
          category: `【控除】${ded.label.replace(/ですか？|ますか？/g, '')}`,
          documents: ded.documents.map((doc) => replaceYearPlaceholder(doc, year)),
        });
      }
    }
  });

  return results;
}

export default function ResultScreen({
  isFullListMode,
  selectedOptions,
  selectedDeductions,
  onBack,
  onReset,
  year,
  companyNames,
  lifeInsuranceCompanies,
  earthquakeInsuranceCompanies,
  bankNames,
  medicalBankNames,
  realEstateBankNames,
}: ResultScreenProps) {
  const results = generateResultList(
    isFullListMode,
    selectedOptions,
    selectedDeductions,
    year,
    companyNames,
    lifeInsuranceCompanies,
    earthquakeInsuranceCompanies,
    bankNames,
    medicalBankNames,
    realEstateBankNames
  );
  const currentDate = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return (
    <div className="animate-fade-in">
      <div className="no-print flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center bg-white px-4 py-2 rounded-lg shadow text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {isFullListMode ? 'TOPへ戻る' : '修正する'}
        </button>
        <div className="flex space-x-3">
          <button
            onClick={() => window.print()}
            className="flex items-center px-6 py-2 rounded-lg text-white shadow hover:opacity-90 bg-blue-600 font-bold"
          >
            <Printer className="w-4 h-4 mr-2" /> 印刷 / PDF保存
          </button>
          <button
            onClick={onReset}
            className="flex items-center bg-slate-700 text-white px-4 py-2 rounded-lg shadow hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> TOP
          </button>
        </div>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-xl shadow-xl">
        <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{taxReturnData.title}</h1>
            <p className="text-slate-600">
              {isFullListMode && (
                <span className="inline-block px-2 py-0.5 bg-slate-200 text-slate-700 text-xs font-bold rounded mr-2 align-middle">
                  全リスト表示
                </span>
              )}
              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded mr-2 align-middle">
                令和{year}年分
              </span>
              以下の書類をご準備の上、ご来所またはご郵送ください。
            </p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>発行日: {currentDate}</p>
            <p className="font-bold text-slate-700">{taxReturnData.contactInfo.office}</p>
          </div>
        </div>

        <div className="space-y-8">
          {results.length === 0 && !isFullListMode ? (
            <p className="text-center text-slate-400 py-10">選択された項目がありません。</p>
          ) : (
            results.map((group, index) => (
              <div key={index} className="break-inside-avoid">
                <h3 className="font-bold text-lg mb-3 px-3 py-1 bg-blue-50 border-l-4 border-blue-500 text-slate-800 flex items-center">
                  {group.category}
                </h3>
                <ul className="list-none pl-1 space-y-2">
                  {group.documents.map((doc, docIndex) => (
                    <li
                      key={docIndex}
                      className="flex items-start text-slate-700 py-1 border-b border-dashed border-slate-100 last:border-0"
                    >
                      <span className="inline-block w-4 h-4 mr-3 mt-1 border-2 border-blue-300 rounded-sm flex-shrink-0 print:border-slate-400"></span>
                      <span>{doc}</span>
                    </li>
                  ))}
                </ul>
                {group.note && (
                  <p className="mt-2 text-sm text-slate-500 bg-slate-50 p-2 rounded flex items-start">
                    <Info className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                    {group.note}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-12 pt-6 border-t border-slate-300">
          <div className="flex items-start bg-slate-50 p-4 rounded-lg border border-slate-200">
            <AlertCircle className="w-5 h-5 text-slate-500 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-600 space-y-1">
              <p>
                <strong>【お問い合わせ先】</strong>
              </p>
              <p className="font-bold text-lg text-slate-700">{taxReturnData.contactInfo.office}</p>
              <p>{taxReturnData.contactInfo.address}</p>
              <p>
                TEL: {taxReturnData.contactInfo.tel}
                {taxReturnData.contactInfo.fax && ` / FAX: ${taxReturnData.contactInfo.fax}`}
              </p>
              <br />
              <p>
                <strong>※ご留意事項</strong>
              </p>
              <p>・原本が必要な書類と、コピーで対応可能な書類がございます。詳細はお問い合わせください。</p>
              {isFullListMode && (
                <p className="text-blue-600 font-semibold">
                  ・本リストは「全項目表示」モードです。お客様の状況に関係のない書類も含まれています。
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
