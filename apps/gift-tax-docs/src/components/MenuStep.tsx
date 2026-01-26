import { ChevronRight, CheckCircle2, List } from 'lucide-react';
import { EXTERNAL_LINKS, giftData, type Step, type OptionSelection } from '@/constants';
import { ExternalLinkButton } from '@/components/ui/ExternalLinkButton';

type MenuStepProps = {
    setStep: (step: Step) => void;
    setIsFullListMode: (isFull: boolean) => void;
    setSelectedOptions: (options: OptionSelection) => void;
};

export const MenuStep = ({ setStep, setIsFullListMode, setSelectedOptions }: MenuStepProps) => {
    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <div className="bg-white shadow-xl rounded-2xl overflow-hidden animate-fade-in">
                <header className="bg-emerald-700 p-10 text-center text-white">
                    <h1 className="text-3xl font-bold mb-3">
                        {giftData.title}
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
};
