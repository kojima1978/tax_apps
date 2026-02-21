import { NavLink } from 'react-router-dom';
import Home from 'lucide-react/icons/home';
import Gift from 'lucide-react/icons/gift';
import Table from 'lucide-react/icons/table';
import Building from 'lucide-react/icons/building';
import FileText from 'lucide-react/icons/file-text';
import Printer from 'lucide-react/icons/printer';
import { COMPANY_INFO } from '@/lib/company';

const NAV_ITEMS = [
    { to: '/', label: '贈与税', icon: Gift },
    { to: '/table', label: '早見表', icon: Table },
    { to: '/acquisition-tax', label: '取得税', icon: Building },
    { to: '/registration-tax', label: '登録免許税', icon: FileText },
] as const;

const Navigation = () => (
    <header className="header-custom">
        <div className="header-top">
            <div className="header-left">
                <a href="/" className="btn-portal" title="ポータルに戻る">
                    <Home size={24} />
                </a>
                <div>
                    <h1>税額シミュレーター</h1>
                    <p className="header-subtitle">Tax Simulator</p>
                </div>
            </div>
            <address className="header-company">
                <p className="company-name">{COMPANY_INFO.name}</p>
                <p>{COMPANY_INFO.postalCode}</p>
                <p>{COMPANY_INFO.address}</p>
                <p>TEL: {COMPANY_INFO.phone}</p>
            </address>
        </div>
        <nav className="header-nav">
            <div className="nav-tabs">
                {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) =>
                            `nav-tab ${isActive ? 'active' : ''}`
                        }
                    >
                        <Icon size={16} />
                        {label}
                    </NavLink>
                ))}
            </div>
            <button className="btn-print" onClick={() => window.print()}>
                <Printer size={16} />
                印刷
            </button>
        </nav>
    </header>
);

export default Navigation;
