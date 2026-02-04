import { FileSpreadsheet, Layout, Printer, RefreshCw, ArrowLeft, Info, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { COMPANY_INFO, giftData, type DocumentGroup, type Step } from '@/constants';

type ResultStepProps = {
    setStep: (step: Step) => void;
    resetToMenu: () => void;
    isTwoColumnPrint: boolean;
    togglePrintColumn: () => void;
    showUncheckedInPrint: boolean;
    toggleShowUnchecked: () => void;
    handleExcelExport: () => void;
    handlePrint: () => void;
    getPrintClass: (oneCol: string, twoCol: string) => string;
    results: DocumentGroup[];
    currentDate: string;
    staffName: string;
    staffPhone: string;
    customerName: string;
};

export const ResultStep = ({
    setStep,
    resetToMenu,
    isTwoColumnPrint,
    togglePrintColumn,
    showUncheckedInPrint,
    toggleShowUnchecked,
    handleExcelExport,
    handlePrint,
    getPrintClass,
    results,
    currentDate,
    staffName,
    staffPhone,
    customerName,
}: ResultStepProps) => {
    const hasResults = results.length > 0 && results.some((g) => g.documents.length > 0);

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in">
            <div className="no-print flex items-center justify-between mb-6">
                <button
                    onClick={() => setStep('edit')}
                    className="flex items-center bg-white px-4 py-2 rounded-lg shadow text-slate-600 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    編集画面へ戻る
                </button>
                <div className="flex space-x-3">
                    <button
                        onClick={toggleShowUnchecked}
                        className={`flex items-center px-4 py-2 rounded-lg shadow hover:opacity-90 font-bold transition-colors ${
                            showUncheckedInPrint
                                ? 'bg-amber-500 text-white'
                                : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                        title={showUncheckedInPrint ? '選択済みのみ表示' : '全て表示'}
                    >
                        {showUncheckedInPrint ? (
                            <>
                                <Eye className="w-4 h-4 mr-2" /> 全表示
                            </>
                        ) : (
                            <>
                                <EyeOff className="w-4 h-4 mr-2" /> 選択のみ
                            </>
                        )}
                    </button>
                    <button
                        onClick={togglePrintColumn}
                        className={`flex items-center px-4 py-2 rounded-lg shadow hover:opacity-90 font-bold transition-colors ${isTwoColumnPrint
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
                {!hasResults ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">📋</div>
                        <h2 className="text-xl font-bold text-slate-700 mb-2">書類が選択されていません</h2>
                        <p className="text-slate-500 mb-6">
                            編集画面で必要な書類にチェックを入れてください。
                        </p>
                        <button
                            onClick={() => setStep('edit')}
                            className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                        >
                            編集画面へ戻る
                        </button>
                    </div>
                ) : (
                    <>
                        <div className={`border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-end ${getPrintClass('print:pb-4 print:mb-6', 'print:pb-0 print:mb-2 print:border-b')}`}>
                            <div>
                                <h1 className={`text-3xl font-bold text-slate-900 mb-2 ${getPrintClass('print:text-2xl print:mb-2', 'print:text-lg print:mb-0')}`}>
                                    {giftData.title}
                                </h1>
                                <div className={`text-slate-700 font-medium mb-2 ${getPrintClass('print:text-base', 'print:text-xs')}`}>
                                    {customerName && <span className="mr-4">お客様名: {customerName}</span>}
                                    {staffName && <span>担当者: {staffName}</span>}
                                </div>
                                <p className={`text-slate-600 ${getPrintClass('print:text-sm', 'print:text-[10px]')}`}>
                                    以下の書類をご準備の上、ご来所・ご郵送ください。
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
                                            <li key={docIdx}>
                                                {/* 大項目 */}
                                                <div
                                                    className={`flex items-start text-slate-700 py-1 border-b border-dashed border-slate-100 ${doc.subItems.length > 0 ? 'border-b-0' : ''} ${getPrintClass('print:py-1', 'print:py-0.5')}`}
                                                >
                                                    <span className={`inline-block w-4 h-4 mr-3 mt-1 border-2 border-emerald-300 rounded-sm flex-shrink-0 border-slate-400 ${getPrintClass('print:w-3 print:h-3 print:mt-1 print:mr-2', 'print:w-2 print:h-2 print:mt-0.5 print:mr-1')}`} />
                                                    <span className={getPrintClass('print:text-sm', 'print:text-[10px] print:leading-tight')}>{doc.text}</span>
                                                </div>
                                                {/* 中項目 */}
                                                {doc.subItems.length > 0 && (
                                                    <ul className={`ml-7 space-y-1 pb-1 border-b border-dashed border-slate-100 ${getPrintClass('print:ml-5 print:space-y-0', 'print:ml-3 print:space-y-0')}`}>
                                                        {doc.subItems.map((subItem, subIdx) => (
                                                            <li
                                                                key={subIdx}
                                                                className={`flex items-start text-slate-600 ${getPrintClass('print:text-xs', 'print:text-[9px] print:leading-tight')}`}
                                                            >
                                                                <span className={`text-slate-400 mr-2 ${getPrintClass('', 'print:mr-1')}`}>└</span>
                                                                <span>{subItem}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
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
                                {staffPhone && (
                                    <>
                                        <br />
                                        <span className="text-slate-600 font-medium">
                                            担当: {staffName || '−'} / 携帯: {staffPhone}
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
