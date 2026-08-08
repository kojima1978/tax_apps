import { HomeIcon } from "./Icons";
import PrintMenu from "./PrintMenu";
import type { PrintOptionKey, PrintOptions } from "@/lib/print-options";

type HeaderProps = {
    printOptions: PrintOptions;
    onPrintOptionChange: (key: PrintOptionKey, value: boolean) => void;
    onPrint: () => void;
};

const Header = ({ printOptions, onPrintOptionChange, onPrint }: HeaderProps) => {
    return (
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 no-print">
            <div className="max-w-7xl mx-auto flex items-center h-14 px-4 gap-2">
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

                <PrintMenu
                    options={printOptions}
                    onOptionChange={onPrintOptionChange}
                    onPrint={onPrint}
                />
            </div>
        </header>
    );
};

export default Header;
