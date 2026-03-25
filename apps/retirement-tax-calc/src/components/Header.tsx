import { HomeIcon, DownloadIcon } from "./Icons";

type HeaderProps = {
    onPrint: () => void;
    onPdf: () => void;
    isExporting: boolean;
};

const Header = ({ onPrint, onPdf, isExporting }: HeaderProps) => {
    return (
        <header className="header-custom">
            <div className="header-left">
                <a href="/" className="btn-home" title="ポータルへ戻る" aria-label="ポータルへ戻る">
                    <HomeIcon />
                </a>
                <h1>退職金 税額計算シミュレーター</h1>
            </div>
            <div className="header-buttons">
                <button className="btn-pdf" onClick={onPdf} title="PDFダウンロード" disabled={isExporting}>
                    <DownloadIcon />
                    {isExporting ? "生成中…" : "PDF"}
                </button>
                <button className="btn-print" onClick={onPrint}>
                    印刷
                </button>
            </div>
        </header>
    );
};

export default Header;
