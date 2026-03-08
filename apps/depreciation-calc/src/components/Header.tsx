type HeaderProps = {
    onPrint: () => void;
};

const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
);

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
                <h1 className="text-base sm:text-xl lg:text-2xl font-bold m-0">中古資産の耐用年数・簿価計算</h1>
            </div>
            <button
                className="bg-white/20 border border-white/40 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded cursor-pointer text-sm hover:bg-white/30 transition-colors"
                onClick={onPrint}
            >
                印刷
            </button>
        </header>
    );
};

export default Header;
