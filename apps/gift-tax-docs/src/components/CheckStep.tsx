import { ArrowLeft, CheckSquare, ChevronRight } from 'lucide-react';
import { giftData, type Step, type OptionSelection } from '@/constants';
import { CheckboxOption } from '@/components/ui/CheckboxOption';

type CheckStepProps = {
    setStep: (step: Step) => void;
    setSelectedOptions: (options: OptionSelection) => void;
    selectedOptions: OptionSelection;
    toggleOption: (id: string) => void;
    setIsFullListMode: (isFull: boolean) => void;
};

export const CheckStep = ({
    setStep,
    setSelectedOptions,
    selectedOptions,
    toggleOption,
    setIsFullListMode,
}: CheckStepProps) => {
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
};
