type HeaderProps = {
    onPrint: () => void;
};

const Header = ({ onPrint }: HeaderProps) => {
    return (
        <header className="header-custom">
            <h1>退職金 税額計算シミュレーター</h1>
            <button className="btn-print" onClick={onPrint}>
                印刷
            </button>
        </header>
    );
};

export default Header;
