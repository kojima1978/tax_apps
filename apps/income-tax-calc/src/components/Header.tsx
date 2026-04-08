interface Props {
  onReset: () => void;
}

export default function Header({ onReset }: Props) {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm no-print">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">所得税計算</h1>
          <p className="text-xs text-gray-500 mt-0.5">令和7年分（2025年）確定申告用</p>
        </div>
        <button
          onClick={onReset}
          className="text-sm text-gray-500 hover:text-gray-700 border border-gray-300 rounded px-3 py-1.5
            hover:bg-gray-50 transition-colors"
        >
          リセット
        </button>
      </div>
    </header>
  );
}
