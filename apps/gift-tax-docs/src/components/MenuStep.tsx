import { ChevronRight, List } from 'lucide-react';
import { EXTERNAL_LINKS, giftData, type Step } from '@/constants';
import { ExternalLinkButton } from '@/components/ui/ExternalLinkButton';

type MenuStepProps = {
    setStep: (step: Step) => void;
    staffName: string;
    setStaffName: (name: string) => void;
    staffPhone: string;
    setStaffPhone: (phone: string) => void;
    customerName: string;
    setCustomerName: (name: string) => void;
};

export const MenuStep = ({
    setStep,
    staffName,
    setStaffName,
    staffPhone,
    setStaffPhone,
    customerName,
    setCustomerName
}: MenuStepProps) => {
    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <div className="bg-white shadow-xl rounded-2xl overflow-hidden animate-fade-in">
                <header className="bg-emerald-700 p-10 text-center text-white">
                    <h1 className="text-3xl font-bold mb-3">
                        {giftData.title}
                    </h1>
                    <p className="text-emerald-100 text-lg">
                        必要な書類を選択して、お客様へご案内できます。
                    </p>

                    <div className="mt-6 flex flex-col md:flex-row items-stretch justify-center gap-4">
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

                    {/* 入力フォームエリア */}
                    <div className="mt-8 bg-emerald-800/50 p-6 rounded-lg max-w-3xl mx-auto backdrop-blur-sm">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                            <div>
                                <label htmlFor="customerName" className="block text-sm font-medium text-emerald-100 mb-1">
                                    お客様名
                                </label>
                                <input
                                    type="text"
                                    id="customerName"
                                    className="w-full px-4 py-2 rounded border border-emerald-600 focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-white/90 text-slate-800 placeholder-slate-400"
                                    placeholder="例：山田 太郎 様"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="staffName" className="block text-sm font-medium text-emerald-100 mb-1">
                                    担当者名
                                </label>
                                <input
                                    type="text"
                                    id="staffName"
                                    className="w-full px-4 py-2 rounded border border-emerald-600 focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-white/90 text-slate-800 placeholder-slate-400"
                                    placeholder="例：鈴木 一郎"
                                    value={staffName}
                                    onChange={(e) => setStaffName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label htmlFor="staffPhone" className="block text-sm font-medium text-emerald-100 mb-1">
                                    担当者携帯
                                </label>
                                <input
                                    type="tel"
                                    id="staffPhone"
                                    className="w-full px-4 py-2 rounded border border-emerald-600 focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-white/90 text-slate-800 placeholder-slate-400"
                                    placeholder="例：090-1234-5678"
                                    value={staffPhone}
                                    onChange={(e) => setStaffPhone(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                </header>
                <div className="p-10">
                    <div className="max-w-xl mx-auto">
                        <button
                            onClick={() => setStep('edit')}
                            className="group relative flex flex-col items-center p-8 bg-white border-2 border-emerald-200 rounded-2xl shadow-sm hover:border-emerald-500 hover:shadow-xl transition-all duration-300 text-center w-full"
                        >
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-emerald-600 transition-colors">
                                <List className="w-10 h-10 text-emerald-600 group-hover:text-white" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-800 mb-3">
                                必要書類リストを作成
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                全ての書類を一覧で確認し、
                                <br />
                                <span className="font-bold text-emerald-600">
                                    必要な書類にチェック
                                </span>
                                を入れて案内を作成します。
                            </p>
                            <div className="mt-8 flex items-center px-8 py-3 bg-emerald-600 text-white rounded-full font-bold group-hover:bg-emerald-700 transition-colors">
                                スタート <ChevronRight className="w-5 h-5 ml-2" />
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
};
