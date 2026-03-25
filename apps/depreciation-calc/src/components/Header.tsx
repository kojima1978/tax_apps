import { HomeIcon, PrinterIcon } from "@/components/ui/Icons";

type HeaderProps = {
    onPrint: () => void;
};

const Header = ({ onPrint }: HeaderProps) => {
    return (
        <header className="bg-green-800 text-white px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center no-print">
            <div className="flex items-center gap-3">
                <a
                    href="/"
                    className="flex items-center justify-center w-9 h-9 rounded-md bg-white/15 hover:bg-white/30 transition-colors text-white"
                    title="ポータルへ戻る"
                    aria-label="ポータルへ戻る"
                >
                    <HomeIcon />
                </a>
                <h1 className="text-base sm:text-xl lg:text-2xl font-bold m-0">減価償却ツール</h1>
            </div>
            <button
                className="flex items-center gap-1.5 bg-white/20 border border-white/40 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded cursor-pointer text-sm hover:bg-white/30 transition-colors"
                onClick={onPrint}
            >
                <PrinterIcon />
                印刷
            </button>
        </header>
    );
};

export default Header;
