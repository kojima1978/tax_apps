type HeaderProps = {
    onPrint: () => void;
};

const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
);

const Header = ({ onPrint }: HeaderProps) => {
    return (
        <header className="header-custom">
            <div className="header-left">
                <a href="/" className="btn-home" title="ポータルへ戻る">
                    <HomeIcon />
                </a>
                <h1>退職金 税額計算シミュレーター</h1>
            </div>
            <button className="btn-print" onClick={onPrint}>
                印刷
            </button>
        </header>
    );
};

export default Header;
