'use client';

import { useState } from 'react';
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
} from 'lucide-react';

// データ定義
interface DocumentGroup {
  category: string;
  documents: string[];
  note?: string;
}

interface Option {
  id: string;
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
        '受贈者（もらった人）の本人確認書類（マイナンバーカード、免許証等）',
        '受贈者（もらった人の戸籍謄本または住民票（必要に応じて）',
        '贈与者（あげた人）の氏名・生年月日・住所・続柄のメモ',
      ],
      note: '※e-Tax利用時はマイナンバーカードとパスワード（利用者証明用・署名用）が必要です。',
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
        '預貯金の通帳（入金が確認できるもの）',
        '振込明細書など',
      ],
    },
    {
      id: 'gift_stock_listed',
      label: '上場株式をもらいましたか？',
      documents: [
        '上場株式の評価明細書',
        '証券会社発行の残高証明書等（評価額のわかるもの）',
        '贈与契約書',
      ],
    },
    {
      id: 'gift_stock_unlisted',
      label: '取引相場のない株式（非上場株式）をもらいましたか？',
      documents: [
        '取引相場のない株式（出資）の評価明細書',
        '当該法人の決算書等（株価算定用）☆別途ご案内させていただきます。',
        '贈与契約書',
      ],
    },
  ] as Option[],
  specials: [
    {
      id: 'sp_seisan',
      label: '「相続時精算課税制度」を選択しますか？',
      documents: [
        '受贈者（もらった人）の戸籍謄本または抄本（氏名、生年月日、子・孫であることの証明）',
        '受贈者（もらった人）の戸籍の附票（住所の証明）',
        '贈与者（あげた人）の住民票の除票（贈与者が亡くなっている場合）',
      ],
      note: '※過去に届出書を提出済みの場合は添付不要な場合があります。',
    },
    {
      id: 'sp_spouse',
      label: '「配偶者控除の特例」を適用しますか？（婚姻期間20年以上）',
      documents: [
        '受贈者（もらった人）の戸籍謄本または抄本（婚姻期間20年以上等の証明）',
        '受贈者（もらった人）の戸籍の附票の写し',
        '居住用不動産の登記事項証明書（取得の証明）',
      ],
    },
    {
      id: 'sp_housing',
      label: '「住宅取得等資金の非課税」を適用しますか？',
      documents: [
        '受贈者（もらった人）の戸籍謄本（氏名、親族関係の証明）',
        '源泉徴収票または確定申告書控え（所得要件の確認）',
        '工事請負契約書または売買契約書の写し',
        '登記事項証明書（新築・取得後）',
      ],
    },
  ] as Option[],
};

type Step = 'menu' | 'check' | 'result';

export default function GiftTaxDocGuide() {
  const [step, setStep] = useState<Step>('menu');
  const [selectedOptions, setSelectedOptions] = useState<Record<string, boolean>>({});
  const [isFullListMode, setIsFullListMode] = useState(false);

  const toggleOption = (id: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const generateResultList = (): DocumentGroup[] => {
    const results: DocumentGroup[] = [];

    // 1. 基本書類
    results.push(...giftData.baseRequired);

    // 2. 財産の種類別
    giftData.options.forEach((opt) => {
      if (isFullListMode || selectedOptions[opt.id]) {
        results.push({
          category: opt.label
            .replace('をもらいましたか？', '')
            .replace('はありますか？', ''),
          documents: opt.documents,
        });
      }
    });

    // 3. 特例
    giftData.specials.forEach((sp) => {
      if (isFullListMode || selectedOptions[sp.id]) {
        results.push({
          category: `【特例】${sp.label
            .replace('を選択しますか？', '')
            .replace('を適用しますか？', '')
            .replace('（婚姻期間20年以上）', '')}`,
          documents: sp.documents,
          note: sp.note || undefined,
        });
      }
    });

    return results;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExcelExport = () => {
    const results = generateResultList();
    const currentDate = new Date().toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    // スタイル定義
    const styles = {
      title: {
        font: { bold: true, sz: 18, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '047857' } }, // emerald-700
        alignment: { horizontal: 'center', vertical: 'center' },
      },
      subTitle: {
        font: { sz: 11, color: { rgb: '374151' } },
        alignment: { horizontal: 'left', vertical: 'center' },
      },
      badge: {
        font: { bold: true, sz: 10, color: { rgb: '1E40AF' } },
        fill: { fgColor: { rgb: 'DBEAFE' } }, // blue-100
        alignment: { horizontal: 'left', vertical: 'center' },
      },
      tableHeader: {
        font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '059669' } }, // emerald-600
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
        fill: { fgColor: { rgb: 'D1FAE5' } }, // emerald-100
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
        fill: { fgColor: { rgb: 'FEF3C7' } }, // amber-100
        alignment: { horizontal: 'left', vertical: 'center' },
      },
      cautionText: {
        font: { sz: 10, color: { rgb: '78716C' } },
        alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
      },
      footer: {
        font: { sz: 9, color: { rgb: '9CA3AF' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      },
    };

    // ワークブック作成
    const wb = XLSX.utils.book_new();
    const wsData: object[][] = [];

    // 行番号追跡
    let rowNum = 0;

    // タイトル行
    wsData.push([{ v: giftData.title, s: styles.title }]);
    rowNum++;

    // サブタイトル
    wsData.push([{ v: `発行日: ${currentDate}`, s: styles.subTitle }]);
    rowNum++;
    wsData.push([{ v: '税理士法人 マスエージェント', s: styles.subTitle }]);
    rowNum++;
    wsData.push([{ v: isFullListMode ? '【全リスト表示】' : '【お客様専用リスト】', s: styles.badge }]);
    rowNum++;

    // 空行
    wsData.push([]);
    rowNum++;

    // テーブルヘッダー
    wsData.push([
      { v: 'カテゴリ', s: styles.tableHeader },
      { v: '必要書類', s: styles.tableHeader },
      { v: '✓', s: styles.tableHeader },
      { v: '備考', s: styles.tableHeader },
    ]);
    rowNum++;

    // 各カテゴリのデータ
    results.forEach((group) => {
      group.documents.forEach((doc, idx) => {
        wsData.push([
          { v: idx === 0 ? group.category : '', s: idx === 0 ? styles.categoryCell : styles.documentCell },
          { v: doc, s: styles.documentCell },
          { v: '☐', s: styles.checkCell },
          { v: idx === 0 && group.note ? group.note : '', s: styles.noteCell },
        ]);
        rowNum++;
      });
    });

    // 空行
    wsData.push([]);
    rowNum++;

    // 注意事項ヘッダー
    wsData.push([{ v: '【ご留意事項】', s: styles.cautionHeader }]);
    rowNum++;

    // 注意事項
    wsData.push([{ v: '・原本が必要な書類と、コピーで対応可能な書類がございます。ご不明な点は担当者にご確認ください。', s: styles.cautionText }]);
    rowNum++;
    wsData.push([{ v: '・公的機関（市役所等）で取得する証明書は、原則として発行後3ヶ月以内のものをご用意ください。', s: styles.cautionText }]);
    rowNum++;
    if (isFullListMode) {
      wsData.push([{ v: '・本リストは「全項目表示」モードで出力されています。お客様の状況により不要な書類も含まれていますのでご注意ください。', s: styles.cautionText }]);
      rowNum++;
    }

    // 空行
    wsData.push([]);
    rowNum++;

    // フッター
    wsData.push([{ v: '〒770-0002 徳島県徳島市春日２丁目３番３３号 / TEL 088-632-6228 / FAX 088-631-9870', s: styles.footer }]);

    // ワークシート作成
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 列幅設定
    ws['!cols'] = [
      { wch: 32 }, // カテゴリ
      { wch: 55 }, // 必要書類
      { wch: 6 },  // チェック
      { wch: 45 }, // 備考
    ];

    // 行の高さ設定
    ws['!rows'] = [
      { hpt: 35 }, // タイトル行
    ];

    // セル結合（タイトル行）
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // タイトル
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // 発行日
      { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }, // 事務所名
      { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } }, // モード表示
    ];

    XLSX.utils.book_append_sheet(wb, ws, '必要書類リスト');

    // ファイル名生成
    const fileName = `贈与税申告_必要書類_${currentDate.replace(/\//g, '')}.xlsx`;

    // ダウンロード
    XLSX.writeFile(wb, fileName);
  };

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
            <div className="mt-6 flex justify-center">
              <a
                href="https://www.nta.go.jp/about/organization/tokyo/topics/check/r07/01.htm"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center px-5 py-3 rounded-xl bg-emerald-800 bg-opacity-40 text-emerald-50 hover:bg-opacity-100 hover:text-white transition-all text-sm border border-emerald-600 hover:border-emerald-400 hover:shadow-lg"
              >
                <FileText className="w-5 h-5 mr-3 text-emerald-200 group-hover:text-white" />
                <span className="text-left">
                  <span className="block text-xs text-emerald-300 group-hover:text-emerald-100 mb-0.5">
                    参考リンク（国税庁）
                  </span>
                  <span className="font-bold border-b border-transparent group-hover:border-white transition-colors">
                    資産税（相続税、贈与税、財産評価及び譲渡所得）関係チェックシート等
                  </span>
                </span>
                <ExternalLink className="w-4 h-4 ml-3 opacity-60 group-hover:opacity-100" />
              </a>
            </div>
          </header>
          <div className="p-10">
            <h2 className="text-xl font-semibold text-center mb-10 text-slate-600">
              ご希望の案内方法を選択してください
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
              {/* ボタンA */}
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
              {/* ボタンB */}
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
                  <label
                    key={opt.id}
                    onClick={() => toggleOption(opt.id)}
                    className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedOptions[opt.id]
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`mt-1 w-5 h-5 flex items-center justify-center border rounded ${
                        selectedOptions[opt.id]
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {selectedOptions[opt.id] && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="ml-3 text-slate-700 font-medium">
                      {opt.label}
                    </span>
                  </label>
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
                  <label
                    key={sp.id}
                    onClick={() => toggleOption(sp.id)}
                    className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedOptions[sp.id]
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`mt-1 w-5 h-5 flex items-center justify-center border rounded ${
                        selectedOptions[sp.id]
                          ? 'bg-emerald-600 border-emerald-600'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {selectedOptions[sp.id] && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                    <span className="ml-3 text-slate-700 font-medium">
                      {sp.label}
                    </span>
                  </label>
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
  const results = generateResultList();
  const currentDate = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
      <div className="no-print flex items-center justify-between mb-6">
        <button
          onClick={() => {
            if (isFullListMode) {
              setStep('menu');
              setSelectedOptions({});
              setIsFullListMode(false);
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
            onClick={() => {
              setStep('menu');
              setSelectedOptions({});
              setIsFullListMode(false);
            }}
            className="flex items-center bg-slate-700 text-white px-4 py-2 rounded-lg shadow hover:bg-slate-800"
          >
            <RefreshCw className="w-4 h-4 mr-2" /> TOP
          </button>
        </div>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-xl shadow-xl print:p-0 print:shadow-none">
        <div className="border-b-2 border-slate-800 pb-6 mb-8 print:pb-4 print:mb-6 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2 print:text-2xl">
              {giftData.title}
            </h1>
            <p className="text-slate-600 print:text-sm">
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
            <p>税理士法人 マスエージェント</p>
          </div>
        </div>

        <div className="space-y-8 print:space-y-4">
          {results.map((group, idx) => (
            <div key={idx} className="break-inside-avoid">
              <h3 className="font-bold text-lg mb-3 px-3 py-1 bg-emerald-50 border-l-4 border-emerald-500 text-slate-800 flex items-center print:mb-2 print:text-sm print:py-0.5">
                {group.category}
              </h3>
              <ul className="list-none pl-1 space-y-2 print:space-y-0">
                {group.documents.map((doc, docIdx) => (
                  <li
                    key={docIdx}
                    className="flex items-start text-slate-700 py-1 border-b border-dashed border-slate-100 last:border-0 print:py-0.5"
                  >
                    <span className="inline-block w-4 h-4 mr-3 mt-1 border-2 border-emerald-300 rounded-sm flex-shrink-0 print:border-slate-400 print:w-3 print:h-3" />
                    <span className="print:text-sm">{doc}</span>
                  </li>
                ))}
              </ul>
              {group.note && (
                <p className="mt-2 text-sm text-slate-500 bg-slate-50 p-2 rounded flex items-start print:mt-2 print:p-2 print:text-xs">
                  <Info className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0 print:w-3 print:h-3" />
                  {group.note}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-slate-300 print:mt-8 print:pt-6">
          <div className="flex items-start bg-slate-50 p-4 rounded-lg border border-slate-200 print:p-4">
            <AlertCircle className="w-5 h-5 text-slate-500 mr-2 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-slate-600 space-y-1">
              <p>
                <strong>ご留意事項</strong>
              </p>
              <p>
                ・原本が必要な書類と、コピーで対応可能な書類がございます。ご不明な点は担当者にご確認ください。
              </p>
              <p>
                ・公的機関（市役所等）で取得する証明書は、原則として発行後3ヶ月以内のものをご用意ください。
              </p>
              {isFullListMode && (
                <p className="text-blue-600 font-semibold print:text-slate-600">
                  ・本リストは「全項目表示」モードで出力されています。お客様の状況により不要な書類も含まれていますのでご注意ください。
                </p>
              )}
            </div>
          </div>
          <div className="mt-8 text-center text-sm text-slate-400 print:mt-8">
            〒770-0002 徳島県徳島市春日２丁目３番３３号
            <br />
            TEL 088-632-6228 / FAX 088-631-9870
          </div>
        </div>
      </div>
    </div>
  );
}
