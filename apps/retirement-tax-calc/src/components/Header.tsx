import { HomeIcon, DownloadIcon } from "./Icons";

type HeaderProps = {
    onPrint: () => void;
    onPdf: () => void;
    isExporting: boolean;
};

const Header = ({ onPrint, onPdf, isExporting }: HeaderProps) => {
    return (
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 no-print">
            <div className="max-w-7xl mx-auto flex items-center h-14 px-4 gap-2">
                {/* Left: Portal */}
                <a
                    href="/"
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm font-medium text-slate-400 hover:text-emerald-600 transition-colors flex-shrink-0"
                    title="ポータルに戻る"
                    aria-label="ポータルに戻る"
                >
                    <HomeIcon size={20} />
                    <span className="hidden sm:inline">ポータル</span>
                </a>

                <div className="flex-1" />

                {/* Right: PDF + Print */}
                <button
                    onClick={onPdf}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors border border-transparent hover:border-slate-200 flex-shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="PDFダウンロード"
                >
                    <DownloadIcon />
                    <span>{isExporting ? "生成中…" : "PDF"}</span>
                </button>
                <button
                    onClick={onPrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors border border-transparent hover:border-slate-200 flex-shrink-0 cursor-pointer"
                >
                    印刷
                </button>
            </div>
        </header>
    );
};

export default Header;
