import type { ReactNode } from "react";
import { HomeIcon, PrinterIcon } from "@/components/ui/Icons";

type Tab = 'life' | 'depreciation' | 'period';

type TabItem = {
    key: Tab;
    label: string;
    shortLabel: string;
    icon: ReactNode;
};

type HeaderProps = {
    tabs: TabItem[];
    activeTab: Tab;
    onTabChange: (tab: Tab) => void;
    onPrint: () => void;
};

const Header = ({ tabs, activeTab, onTabChange, onPrint }: HeaderProps) => {
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
                    <span className="hidden lg:inline">ポータル</span>
                </a>

                {/* Center: Tab Navigation */}
                <nav className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => onTabChange(tab.key)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer ${
                                activeTab === tab.key
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                            }`}
                        >
                            {tab.icon}
                            <span className="hidden md:inline">{tab.label}</span>
                            <span className="md:hidden text-xs">{tab.shortLabel}</span>
                        </button>
                    ))}
                </nav>

                {/* Right: Print */}
                <button
                    onClick={onPrint}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors border border-transparent hover:border-slate-200 flex-shrink-0 cursor-pointer"
                    aria-label="印刷"
                >
                    <PrinterIcon size={16} />
                    <span className="hidden sm:inline">印刷</span>
                </button>
            </div>
        </header>
    );
};

export default Header;
export type { Tab, TabItem };
