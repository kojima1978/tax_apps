import { useState, useCallback, useRef } from "react";

type ActionButtonsProps = {
    canCalculate: boolean;
    hasResult?: boolean;
    onCalculate: () => void;
    onClear: () => void;
};

const ActionButtons = ({ canCalculate, hasResult, onCalculate, onClear }: ActionButtonsProps) => {
    const [calculating, setCalculating] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout>>();

    const handleCalculate = useCallback(() => {
        if (calculating) return;
        setCalculating(true);
        onCalculate();
        timerRef.current = setTimeout(() => setCalculating(false), 300);
    }, [calculating, onCalculate]);

    const handleClear = useCallback(() => {
        if (!hasResult || window.confirm('入力内容と計算結果をクリアしますか？')) {
            onClear();
        }
    }, [hasResult, onClear]);

    return (
        <div className="flex gap-3 no-print">
            <button
                className="flex-1 flex items-center justify-center gap-2 bg-green-800 text-white border-none py-3 px-6 rounded text-lg font-bold cursor-pointer transition-colors hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={handleCalculate}
                disabled={!canCalculate || calculating}
            >
                {calculating ? (
                    <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        計算中…
                    </>
                ) : (
                    <>
                        計算する
                        <span className="text-xs font-normal opacity-70 hidden sm:inline">(Ctrl+Enter)</span>
                    </>
                )}
            </button>
            <button
                className="bg-white text-gray-500 border border-gray-300 py-3 px-4 rounded font-semibold cursor-pointer whitespace-nowrap transition-colors hover:bg-gray-100 hover:border-gray-400 hover:text-gray-800"
                onClick={handleClear}
            >
                クリア
            </button>
        </div>
    );
};

export default ActionButtons;
