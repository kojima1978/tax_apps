type HeaderProps = {
    onPrint: () => void;
    onPdf: () => void;
};

const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
        <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const Header = ({ onPrint, onPdf }: HeaderProps) => {
    return (
        <header className="header-custom">
            <div className="header-left">
                <a href="/" className="btn-home" title="ポータルへ戻る" aria-label="ポータルへ戻る">
                    <HomeIcon />
                </a>
                <h1>退職金 税額計算シミュレーター</h1>
            </div>
            <div className="header-buttons">
                <button className="btn-pdf" onClick={onPdf} title="PDFダウンロード">
                    <DownloadIcon />
                    PDF
                </button>
                <button className="btn-print" onClick={onPrint}>
                    印刷
                </button>
            </div>
        </header>
    );
};

export default Header;
