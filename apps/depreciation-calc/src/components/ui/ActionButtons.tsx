type ActionButtonsProps = {
    canCalculate: boolean;
    onCalculate: () => void;
    onClear: () => void;
};

const ActionButtons = ({ canCalculate, onCalculate, onClear }: ActionButtonsProps) => (
    <div className="flex gap-3 no-print">
        <button
            className="flex-1 bg-green-800 text-white border-none py-3 px-6 rounded text-lg font-bold cursor-pointer transition-colors hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={onCalculate}
            disabled={!canCalculate}
        >
            計算する
            <span className="text-xs font-normal opacity-70 ml-2 hidden sm:inline">(Ctrl+Enter)</span>
        </button>
        <button
            className="bg-white text-gray-500 border border-gray-300 py-3 px-4 rounded font-semibold cursor-pointer whitespace-nowrap transition-colors hover:bg-gray-100 hover:border-gray-400 hover:text-gray-800"
            onClick={onClear}
        >
            クリア
        </button>
    </div>
);

export default ActionButtons;
