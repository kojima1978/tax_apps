import { useId } from "react";
import { HomeIcon } from "./Icons";
import PrintMenu from "./PrintMenu";
import { COMPANY_INFO } from "@/lib/company";
import type { PrintOptionKey, PrintOptions } from "@/lib/print-options";

type HeaderProps = {
    staff: string;
    onStaffChange: (value: string) => void;
    printOptions: PrintOptions;
    onPrintOptionChange: (key: PrintOptionKey, value: boolean) => void;
    onPrint: () => void;
};

const Header = ({ staff, onStaffChange, printOptions, onPrintOptionChange, onPrint }: HeaderProps) => {
    const staffId = useId();

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

                {/* 事務所名・担当者は印刷物に載る情報。画面ではここにまとめる */}
                <span className="hidden md:inline text-sm font-bold text-emerald-800 flex-shrink-0">
                    {COMPANY_INFO.name}
                </span>

                <label htmlFor={staffId} className="text-xs text-slate-500 flex-shrink-0 ml-2">
                    担当
                </label>
                <input
                    id={staffId}
                    type="text"
                    value={staff}
                    onChange={(e) => onStaffChange(e.target.value)}
                    placeholder="担当者名"
                    className="w-24 sm:w-32 px-2 py-1 rounded-md border border-slate-200 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
                />

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
