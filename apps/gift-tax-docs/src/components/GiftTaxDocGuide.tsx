'use client';

import { useState, useMemo, useCallback } from 'react';
import XLSX from 'xlsx-js-style';
import {
  FileText,
  ExternalLink,
  CheckCircle2,
  List,
  ChevronRight,
  ArrowLeft,
  CheckSquare,
  Printer,
  RefreshCw,
  AlertCircle,
  Info,
  Check,
  FileSpreadsheet,
  Layout,
} from 'lucide-react';
import { COMPANY_INFO, EXTERNAL_LINKS, type OptionId, type OptionSelection } from '@/constants';

// データ定義
interface DocumentGroup {
  category: string;
  documents: string[];
  note?: string;
}

interface Option {
  id: OptionId;
  label: string;
  documents: string[];
  note?: string;
}

const giftData = {
  title: '贈与税申告 必要書類案内',
  description: '贈与を受けた財産の種類と特例の適用有無を選択してください。',
  baseRequired: [
    {
      category: '本人確認書類（共通・必須）',
      documents: [
        '受贈者（もらった人）の本人確認書類（マイナンバーカード、住民票等）',
        '受贈者（もらった人）の利用者識別番号（国税庁の16桁の番号）',
        '贈与者（あげた人）の本人確認書類（マイナンバーカード、住民票等）',
      ],
    },
  ],
  options: [
    {
      id: 'gift_land',
      label: '土地をもらいましたか？',
      documents: [
        '固定資産税評価証明書',
        '賃貸借契約書（貸している土地の場合）',
      ],
    },
    {
      id: 'gift_house',
      label: '家屋（建物）をもらいましたか？',
      documents: [
        '固定資産税評価証明書',
        '賃貸借契約書（貸している家屋の場合）',
      ],
    },
    {
      id: 'gift_cash',
      label: '現金・預貯金をもらいましたか？',
      documents: [
        '贈与契約書',
        '預貯金の通帳・振込明細書（入金が確認できるもの）',
      ],
    },
    {
      id: 'gift_stock_listed',
      label: '上場株式をもらいましたか？',
      documents: [
        '贈与契約書',
        '証券会社発行の残高証明書等（評価額のわかるもの）',
      ],
    },
    {
      id: 'gift_stock_unlisted',
      label: '取引相場のない株式（非上場株式）をもらいましたか？',
      documents: [
        '贈与契約書',
        '当該法人の決算書等（株価算定用）☆別途ご案内させていただきます。',
      ],
    },
  ] as Option[],
  specials: [
    {
      id: 'sp_tax_rate',
      label: '「贈与税の税率の特例」を適用しますか？',
      documents: [
        '受贈者（もらった人）の戸籍の謄本又は抄本等で次の内容を証する書類',
        '　イ　受贈者（もらった人）の氏名、生年月日',
        '　ロ　受贈者（もらった人）が贈与者（あげた人）の子・孫に該当すること',
      ],
      note: '基礎控除及び配偶者控除の規定による控除後の課税価格が300万円以下である場合には、添付は不要です。',
    },
    {
      id: 'sp_seisan',
      label: '「相続時精算課税制度」を選択しますか？',
      documents: [
        '受贈者（もらった人）の戸籍謄本または抄本（氏名、生年月日、子・孫であることの証明）',
        '受贈者（もらった人）の戸籍の附票（住所の証明）',
        '贈与者（あげた人）の住民票の除票（贈与者が亡くなっている場合）',
      ],
      note: '過去に届出書を提出済みの場合は添付不要です。',
    },
    {
      id: 'sp_spouse',
      label: '「配偶者控除の特例」を適用しますか？（婚姻期間20年以上）',
      documents: [
        '受贈者（もらった人）の戸籍謄本または抄本（婚姻期間20年以上等の証明）',
        '受贈者（もらった人）の戸籍の附票の写し',
        '必要書類の詳細は、「贈与税の配偶者控除の特例」チェックシートをご確認ください。',
      ],
    },
    {
      id: 'sp_housing',
      label: '「住宅取得等資金の非課税」を適用しますか？',
      documents: [
        '受贈者（もらった人）の戸籍謄本（氏名、親族関係の証明）',
        '源泉徴収票または確定申告書控え（所得要件の確認）',
        '工事請負契約書または売買契約書の写し',
        '必要書類の詳細は、「住宅取得等資金の非課税」のチェックシートをご確認ください。',
      ],
    },
  ] as Option[],
};

type Step = 'menu' | 'check' | 'result';

// Excelスタイル定義
const excelStyles = {
  title: {
    font: { bold: true, sz: 18, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '047857' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
  subTitle: {
    font: { sz: 11, color: { rgb: '374151' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  badge: {
    font: { bold: true, sz: 10, color: { rgb: '1E40AF' } },
    fill: { fgColor: { rgb: 'DBEAFE' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  tableHeader: {
    font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '059669' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: '047857' } },
      bottom: { style: 'thin', color: { rgb: '047857' } },
      left: { style: 'thin', color: { rgb: '047857' } },
      right: { style: 'thin', color: { rgb: '047857' } },
    },
  },
  categoryCell: {
    font: { bold: true, sz: 11, color: { rgb: '065F46' } },
    fill: { fgColor: { rgb: 'D1FAE5' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'A7F3D0' } },
      bottom: { style: 'thin', color: { rgb: 'A7F3D0' } },
      left: { style: 'medium', color: { rgb: '059669' } },
      right: { style: 'thin', color: { rgb: 'A7F3D0' } },
    },
  },
  documentCell: {
    font: { sz: 11, color: { rgb: '374151' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'E5E7EB' } },
      bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
      left: { style: 'thin', color: { rgb: 'E5E7EB' } },
      right: { style: 'thin', color: { rgb: 'E5E7EB' } },
    },
  },
  checkCell: {
    font: { sz: 14, color: { rgb: '059669' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E5E7EB' } },
      bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
      left: { style: 'thin', color: { rgb: 'E5E7EB' } },
      right: { style: 'thin', color: { rgb: 'E5E7EB' } },
    },
  },
  noteCell: {
    font: { sz: 10, italic: true, color: { rgb: '6B7280' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'E5E7EB' } },
      bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
      left: { style: 'thin', color: { rgb: 'E5E7EB' } },
      right: { style: 'thin', color: { rgb: 'E5E7EB' } },
    },
  },
  cautionHeader: {
    font: { bold: true, sz: 11, color: { rgb: 'B45309' } },
    fill: { fgColor: { rgb: 'FEF3C7' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  },
  cautionTextRed: {
    font: { sz: 10, color: { rgb: 'FF0000' } },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
  },
  footer: {
    font: { sz: 9, color: { rgb: '9CA3AF' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  },
};

// チェックボックスコンポーネント
function CheckboxOption({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${
        checked
          ? 'border-emerald-500 bg-emerald-50'
          : 'border-slate-100 hover:border-slate-300'
      }`}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={() => onChange(id)}
        className="sr-only"
      />
      <div
        className={`mt-1 w-5 h-5 flex items-center justify-center border rounded ${
          checked
            ? 'bg-emerald-600 border-emerald-600'
            : 'bg-white border-gray-300'
        }`}
        aria-hidden="true"
      >
        {checked && <Check className="w-3 h-3 text-white" />}
      </div>
      <span className="ml-3 text-slate-700 font-medium">{label}</span>
    </label>
  );
}

// 外部リンクコンポーネント
function ExternalLinkButton({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center px-5 py-3 rounded-xl bg-emerald-800 bg-opacity-40 text-emerald-50 hover:bg-opacity-100 hover:text-white transition-all text-sm border border-emerald-600 hover:border-emerald-400 hover:shadow-lg"
    >
      <FileText className="w-5 h-5 mr-3 text-emerald-200 group-hover:text-white" />
      <span className="text-left">
        <span className="block text-xs text-emerald-300 group-hover:text-emerald-100 mb-0.5">
          {description}
        </span>
        <span className="font-bold border-b border-transparent group-hover:border-white transition-colors">
          {label}
        </span>
      </span>
      <ExternalLink className="w-4 h-4 ml-3 opacity-60 group-hover:opacity-100" />
    </a>
  );
}

export default function GiftTaxDocGuide() {
  const [step, setStep] = useState<Step>('menu');
  const [selectedOptions, setSelectedOptions] = useState<OptionSelection>({});
  const [isFullListMode, setIsFullListMode] = useState(false);
  const [isTwoColumnPrint, setIsTwoColumnPrint] = useState(false);

  // 状態リセット
  const resetToMenu = useCallback(() => {
    setStep('menu');
    setSelectedOptions({});
    setIsFullListMode(false);
  }, []);

  const toggleOption = useCallback((id: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [id]: !prev[id as OptionId],
    }));
  }, []);

  // 結果リスト生成（メモ化）
  const results = useMemo((): DocumentGroup[] => {
    const list: DocumentGroup[] = [];

    list.push(...giftData.baseRequired);

    giftData.options.forEach((opt) => {
      if (isFullListMode || selectedOptions[opt.id]) {
        list.push({
          category: opt.label
            .replace('をもらいましたか？', '')
            .replace('はありますか？', ''),
          documents: opt.documents,
        });
      }
    });

    giftData.specials.forEach((sp) => {
      if (isFullListMode || selectedOptions[sp.id]) {
        list.push({
          category: `【特例】${sp.label
            .replace('を選択しますか？', '')
            .replace('を適用しますか？', '')
            .replace('（婚姻期間20年以上）', '')}`,
          documents: sp.documents,
          note: sp.note || undefined,
        });
      }
    });

    return list;
  }, [isFullListMode, selectedOptions]);

  const currentDate = useMemo(() => {
    return new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }, []);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleExcelExport = useCallback(() => {
    const wb = XLSX.utils.book_new();
    const wsData: Array<Array<{ v: string; s?: typeof excelStyles[keyof typeof excelStyles] }>> = [];
    const merges: XLSX.Range[] = [];
    let rowNum = 0;

    // タイトル行
    wsData.push([{ v: giftData.title, s: excelStyles.title }]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 3 } });
    rowNum++;

    // サブタイトル
    wsData.push([{ v: `発行日: ${currentDate}`, s: excelStyles.subTitle }]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 3 } });
    rowNum++;

    wsData.push([{ v: COMPANY_INFO.name, s: excelStyles.subTitle }]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 3 } });
    rowNum++;

    wsData.push([{ v: isFullListMode ? '【全リスト表示】' : '【お客様専用リスト】', s: excelStyles.badge }]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 3 } });
    rowNum++;

    wsData.push([{ v: '', s: undefined }]);
    rowNum++;

    // テーブルヘッダー
    wsData.push([
      { v: 'カテゴリ', s: excelStyles.tableHeader },
      { v: '必要書類', s: excelStyles.tableHeader },
      { v: '✓', s: excelStyles.tableHeader },
      { v: '備考', s: excelStyles.tableHeader },
    ]);
    rowNum++;

    // 各カテゴリのデータ
    results.forEach((group) => {
      group.documents.forEach((doc, idx) => {
        wsData.push([
          { v: idx === 0 ? group.category : '', s: idx === 0 ? excelStyles.categoryCell : excelStyles.documentCell },
          { v: doc, s: excelStyles.documentCell },
          { v: '☐', s: excelStyles.checkCell },
          { v: idx === 0 && group.note ? group.note : '', s: excelStyles.noteCell },
        ]);
        rowNum++;
      });
    });

    wsData.push([{ v: '', s: undefined }]);
    rowNum++;

    // 注意事項
    wsData.push([{ v: '【ご留意事項】', s: excelStyles.cautionHeader }]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 3 } });
    rowNum++;

    wsData.push([{ v: '・電子申告を行う場合、原本資料はご返却いたします。', s: excelStyles.cautionTextRed }]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 3 } });
    rowNum++;

    wsData.push([{ v: '', s: undefined }]);
    rowNum++;

    // フッター
    wsData.push([{ v: `${COMPANY_INFO.fullAddress} / ${COMPANY_INFO.contactLine}`, s: excelStyles.footer }]);
    merges.push({ s: { r: rowNum, c: 0 }, e: { r: rowNum, c: 3 } });

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    ws['!cols'] = [
      { wch: 32 },
      { wch: 55 },
      { wch: 6 },
      { wch: 45 },
    ];

    ws['!rows'] = [{ hpt: 35 }];
    ws['!merges'] = merges;

    XLSX.utils.book_append_sheet(wb, ws, '必要書類リスト');

    const fileName = `贈与税申告_必要書類_${currentDate.replace(/\//g, '')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [results, currentDate, isFullListMode]);

  // 印刷用クラス生成
  const getPrintClass = useCallback((oneCol: string, twoCol: string) => {
    return isTwoColumnPrint ? twoCol : oneCol;
  }, [isTwoColumnPrint]);

  // メニュー画面
  if (step === 'menu') {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="bg-white shadow-xl rounded-2xl overflow-hidden animate-fade-in">
          <header className="bg-emerald-700 p-10 text-center text-white">
            <h1 className="text-3xl font-bold mb-3">
              贈与税申告 必要書類案内システム
            </h1>
            <p className="text-emerald-100 text-lg">
              お客様の状況に合わせて、申告に必要な書類をご案内します。
            </p>
            <div className="mt-6 flex flex-col items-center space-y-3">
              <ExternalLinkButton
                href={EXTERNAL_LINKS.ntaCheckSheet.url}
                label={EXTERNAL_LINKS.ntaCheckSheet.label}
                description={EXTERNAL_LINKS.ntaCheckSheet.description}
              />
              <ExternalLinkButton
                href={EXTERNAL_LINKS.etaxDocuments.url}
                label={EXTERNAL_LINKS.etaxDocuments.label}
                description={EXTERNAL_LINKS.etaxDocuments.description}
              />
            </div>
          </header>
          <div className="p-10">
            <h2 className="text-xl font-semibold text-center mb-10 text-slate-600">
              ご希望の案内方法を選択してください
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              <button
                onClick={() => {
                  setStep('check');
                  setIsFullListMode(false);
                  setSelectedOptions({});
                }}
                className="group relative flex flex-col items-center p-8 bg-white border-2 border-emerald-100 rounded-2xl shadow-sm hover:border-emerald-500 hover:shadow-xl transition-all duration-300 text-center w-full"
              >
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-emerald-600 transition-colors">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 group-hover:text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">
                  質問に答えて選ぶ
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  「土地をもらった」「特例を使いたい」などの質問に答えて、
                  <br />
                  <span className="font-bold text-emerald-600">
                    お客様専用のリスト
                  </span>
                  を作成します。
                </p>
                <div className="mt-8 flex items-center px-6 py-2 bg-emerald-50 text-emerald-700 rounded-full font-bold group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  スタート <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </button>
              <button
                onClick={() => {
                  setStep('result');
                  setIsFullListMode(true);
                  setSelectedOptions({});
                }}
                className="group relative flex flex-col items-center p-8 bg-white border-2 border-slate-200 rounded-2xl shadow-sm hover:border-blue-500 hover:shadow-xl transition-all duration-300 text-center w-full"
              >
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
                  <List className="w-10 h-10 text-blue-600 group-hover:text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">
                  全リストを表示
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  まだ詳細が決まっていない場合などに、
                  <br />
                  <span className="font-bold text-blue-600">
                    すべての必要書類一覧
                  </span>
                  を表示・印刷します。
                </p>
                <div className="mt-8 flex items-center px-6 py-2 bg-blue-50 text-blue-700 rounded-full font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  一覧を見る <ChevronRight className="w-4 h-4 ml-1" />
                </div>
              </button>
            </div>
          </div>
          <div className="bg-slate-50 p-6 text-center text-xs text-slate-400 border-t border-slate-100">
            ※本システムは一般的な必要書類を案内するものです。個別の事情により追加書類が必要な場合があります。
          </div>
        </div>
      </div>
    );
  }

  // チェックリスト画面
  if (step === 'check') {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => {
              setStep('menu');
              setSelectedOptions({});
            }}
            className="flex items-center text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> TOPに戻る
          </button>
          <div className="px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-700">
            ステップ 1 / 2
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-emerald-600 p-6 text-white">
            <h2 className="text-2xl font-bold mb-2">状況確認チェックシート</h2>
            <p className="opacity-90">{giftData.description}</p>
          </div>

          <div className="p-6 md:p-8 space-y-8">
            <div>
              <h3 className="flex items-center text-lg font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200">
                <CheckSquare className="w-5 h-5 mr-2 text-emerald-600" />
                該当する項目にチェックを入れてください
              </h3>
              <div className="grid gap-3">
                {giftData.options.map((opt) => (
                  <CheckboxOption
                    key={opt.id}
                    id={opt.id}
                    label={opt.label}
                    checked={!!selectedOptions[opt.id]}
                    onChange={toggleOption}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="flex items-center text-lg font-bold text-slate-700 mb-4 pb-2 border-b border-slate-200">
                <CheckSquare className="w-5 h-5 mr-2 text-emerald-600" />
                適用する特例があれば選択してください
              </h3>
              <div className="grid gap-3">
                {giftData.specials.map((sp) => (
                  <CheckboxOption
                    key={sp.id}
                    id={sp.id}
                    label={sp.label}
                    checked={!!selectedOptions[sp.id]}
                    onChange={toggleOption}
                  />
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex flex-col items-center space-y-4">
              <button
                onClick={() => setStep('result')}
                className="flex items-center px-10 py-4 rounded-full text-white text-lg font-bold shadow-lg transform transition hover:-translate-y-1 bg-emerald-600 hover:bg-emerald-700"
              >
                案内を作成する <ChevronRight className="ml-2 w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setStep('result');
                  setIsFullListMode(true);
                  setSelectedOptions({});
                }}
                className="text-sm text-slate-400 hover:text-blue-600 underline"
              >
                ※よくわからないので、とりあえず全リストを表示する
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 結果画面
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
      <div className="no-print flex items-center justify-between mb-6">
        <button
          onClick={() => {
            if (isFullListMode) {
              resetToMenu();
            } else {
              setStep('check');
            }
          }}
          className="flex items-center bg-white px-4 py-2 rounded-lg shadow text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {isFullListMode ? 'TOPへ戻る' : '選択画面へ戻る'}
        </button>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsTwoColumnPrint(!isTwoColumnPrint)}
            className={`flex items-center px-4 py-2 rounded-lg shadow hover:opacity-90 font-bold transition-colors ${
              isTwoColumnPrint
                ? 'bg-purple-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Layout className="w-4 h-4 mr-2" />
            {isTwoColumnPrint ? '印刷: 2列' : '印刷: 1列'}
          </button>
          <button
            onClick={handleExcelExport}
            className="flex items-center px-6 py-2 rounded-lg text-white shadow hover:opacity-90 bg-blue-600 font-bold"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel出力
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center px-6 py-2 rounded-lg text-white shadow hover:opacity-90 bg-emerald-600 font-bold"
          >
            <Printer className="w-4 h-4 mr-2" /> 印刷 / PDF保存
          </button>
          <button
            onClick={resetToMenu}
            className="flex items-center bg-slate-700 text-white px-4 py-2 rounded-lg shadow hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> TOP
          </button>
        </div>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-xl shadow-xl print:p-0 print:shadow-none">
        <div className={`border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-end ${getPrintClass('print:pb-4 print:mb-6', 'print:pb-0 print:mb-2 print:border-b')}`}>
          <div>
            <h1 className={`text-3xl font-bold text-slate-900 mb-2 ${getPrintClass('print:text-2xl print:mb-2', 'print:text-lg print:mb-0')}`}>
              {giftData.title}
            </h1>
            <p className={`text-slate-600 ${getPrintClass('print:text-sm', 'print:text-[10px]')}`}>
              {isFullListMode && (
                <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded mr-2 align-middle print:border print:border-blue-800">
                  全リスト表示
                </span>
              )}
              {isFullListMode ? '該当する項目の' : '以下の'}
              書類をご準備の上、ご来所・ご郵送ください。
            </p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p>発行日: {currentDate}</p>
            <p>{COMPANY_INFO.name}</p>
          </div>
        </div>

        <div className={`space-y-8 print:block ${getPrintClass('print:space-y-6', 'print:columns-2 print:gap-4 print:space-y-0')}`}>
          {results.map((group, idx) => (
            <div key={idx} className={`break-inside-avoid ${getPrintClass('print:mb-6', 'print:mb-1')}`}>
              <h3 className={`font-bold text-lg mb-3 px-3 py-1 bg-emerald-50 border-l-4 border-emerald-500 text-slate-800 flex items-center ${getPrintClass('print:mb-2 print:text-base print:py-1', 'print:mb-0.5 print:text-xs print:py-0 print:h-5')}`}>
                {group.category}
              </h3>
              <ul className="list-none pl-1 space-y-2 print:space-y-0">
                {group.documents.map((doc, docIdx) => (
                  <li
                    key={docIdx}
                    className={`flex items-start text-slate-700 py-1 border-b border-dashed border-slate-100 last:border-0 ${getPrintClass('print:py-1', 'print:py-0.5')}`}
                  >
                    <span className={`inline-block w-4 h-4 mr-3 mt-1 border-2 border-emerald-300 rounded-sm flex-shrink-0 border-slate-400 ${getPrintClass('print:w-3 print:h-3 print:mt-1 print:mr-2', 'print:w-2 print:h-2 print:mt-0.5 print:mr-1')}`} />
                    <span className={getPrintClass('print:text-sm', 'print:text-[10px] print:leading-tight')}>{doc}</span>
                  </li>
                ))}
              </ul>
              {group.note && (
                <p className={`mt-2 text-sm text-slate-500 bg-slate-50 p-2 rounded flex items-start ${getPrintClass('print:mt-2 print:p-2 print:text-xs', 'print:mt-1 print:p-1 print:text-[10px]')}`}>
                  <Info className={`w-4 h-4 mr-1 mt-0.5 flex-shrink-0 ${getPrintClass('print:w-4 print:h-4', 'print:w-3 print:h-3')}`} />
                  {group.note}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className={`mt-12 pt-6 border-t border-slate-300 ${getPrintClass('print:mt-8 print:pt-6', 'print:mt-2 print:pt-2 print:border-t')}`}>
          <div className={`flex items-start bg-slate-50 p-4 rounded-lg border border-slate-200 ${getPrintClass('print:p-4', 'print:p-1')}`}>
            <AlertCircle className={`w-5 h-5 text-slate-500 mr-2 mt-0.5 flex-shrink-0 ${getPrintClass('print:w-5 print:h-5', 'print:w-3 print:h-3')}`} />
            <div className="text-sm text-slate-600 space-y-1">
              <p>
                <strong>ご留意事項</strong>
              </p>
              <p className={`text-red-600 font-bold ${getPrintClass('print:text-sm', 'print:text-[10px]')}`}>
                ・電子申告を行う場合、原本資料はご返却いたします。
              </p>
            </div>
          </div>
          <div className={`mt-8 text-center text-sm text-slate-400 ${getPrintClass('print:mt-8 print:text-xs', 'print:mt-2 print:text-[9px] print:leading-tight')}`}>
            {COMPANY_INFO.fullAddress}
            <br />
            {COMPANY_INFO.contactLine}
          </div>
        </div>
      </div>
    </div>
  );
}
