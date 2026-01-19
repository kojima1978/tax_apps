import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { File, Building2, CalendarDays, UserPen } from 'lucide-react';
import { toWareki } from '@/lib/date-utils';
import { buttonStyle, btnHoverClass } from '@/lib/button-styles';

type User = {
    id: string;
    name: string;
};

type Company = {
    id: string;
    company_name: string;
};

type Props = {
    fiscalYear: string;
    setFiscalYear: (value: string) => void;
    companyName: string;
    setCompanyName: (value: string) => void;
    personInCharge: string;
    setPersonInCharge: (value: string) => void;
    onBeforeNavigate?: () => void;
};

export default function Step0BasicInfo({
    fiscalYear,
    setFiscalYear,
    companyName,
    setCompanyName,
    personInCharge,
    setPersonInCharge,
    onBeforeNavigate,
}: Props) {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [registeredYears, setRegisteredYears] = useState<string[]>([]);
    const [selectedYearData, setSelectedYearData] = useState<{
        profit_per_share: number;
        net_asset_per_share: number;
        average_stock_price: number;
        is_fallback?: boolean;
        fallback_year?: string;
    } | null>(null);

    const handleNavigation = (path: string) => {
        if (onBeforeNavigate) {
            onBeforeNavigate();
        }
        router.push(path);
    };

    const currentYear = new Date().getFullYear();
    const yearOptions = [];
    for (let i = currentYear + 5; i >= currentYear - 5; i--) {
        yearOptions.push(i);
    }

    // ユーザー一覧を取得
    const fetchUsers = async () => {
        try {
            const response = await fetch('/medical/api/users');
            if (response.ok) {
                const data = await response.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        }
    };

    // 会社一覧を取得
    const fetchCompanies = async () => {
        try {
            const response = await fetch('/medical/api/companies');
            if (response.ok) {
                const data = await response.json();
                setCompanies(data);
            }
        } catch (error) {
            console.error('Failed to fetch companies:', error);
        }
    };

    // 類似業種データが登録されている年度を取得
    const fetchRegisteredYears = async () => {
        try {
            const response = await fetch('/medical/api/similar-industry');
            if (response.ok) {
                const data = await response.json();
                const years = data.map((item: { fiscal_year: string }) => item.fiscal_year);
                setRegisteredYears(years);
            }
        } catch (error) {
            console.error('Failed to fetch similar industry data:', error);
        }
    };

    // 選択された年度のデータを取得
    const fetchYearData = async (year: string) => {
        if (!year) {
            setSelectedYearData(null);
            return;
        }
        try {
            const response = await fetch(`/medical/api/similar-industry?fiscalYear=${year}`);
            if (response.ok) {
                const data = await response.json();
                // フォールバックデータの場合は「未登録」扱い
                if (data.is_fallback) {
                    setSelectedYearData(null);
                } else if (data.profit_per_share !== 0 || data.net_asset_per_share !== 0 || data.average_stock_price !== 0) {
                    setSelectedYearData(data);
                } else {
                    setSelectedYearData(null);
                }
            }
        } catch (error) {
            console.error('年度データの取得に失敗しました:', error);
            setSelectedYearData(null);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchUsers();
        fetchCompanies();
        fetchRegisteredYears();
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchYearData(fiscalYear);
    }, [fiscalYear]);

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <h2 className="mt-0 mb-0">STEP０．基本情報を入力する</h2>
                <button
                    onClick={() => router.push('/saved-data')}
                    className={btnHoverClass}
                    style={buttonStyle}
                >
                    <File size={20} />
                    読み込み
                </button>
            </div>
            <table>
                <tbody>
                    <tr>
                        <th className="text-left w-1/4">項目</th>
                        <th className="text-left">入力</th>
                    </tr>
                    <tr>
                        <td>会社名</td>
                        <td>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                                <select
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    style={{ width: '200px' }}
                                >
                                    <option value="">選択してください</option>
                                    {companies.map((company) => (
                                        <option key={company.id} value={company.company_name}>
                                            {company.company_name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => handleNavigation('/company-settings')}
                                    className={btnHoverClass}
                                    style={buttonStyle}
                                >
                                    <Building2 size={20} />
                                    会社マスタ設定
                                </button>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td>年度</td>
                        <td>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <select
                                        value={fiscalYear}
                                        onChange={(e) => setFiscalYear(e.target.value)}
                                        style={{ width: '200px' }}
                                    >
                                        <option value="">選択してください</option>
                                        {yearOptions.map((year) => {
                                            const isRegistered = registeredYears.includes(year.toString());
                                            return (
                                                <option key={year} value={year.toString()}>
                                                    {toWareki(year)}年度{isRegistered ? ' ✓' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                    {fiscalYear && selectedYearData && (
                                        <div style={{ fontSize: '12px', color: '#000000', fontWeight: 'bold' }}>
                                            ✓ データ登録済み
                                        </div>
                                    )}
                                    {fiscalYear && !selectedYearData && (
                                        <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>
                                            ⚠ データ未登録
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleNavigation(`/similar-industry-settings?year=${fiscalYear}`)}
                                    className={btnHoverClass}
                                    style={buttonStyle}
                                >
                                    <CalendarDays size={20} />
                                    類似業種データ設定
                                </button>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td>担当者</td>
                        <td>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                                <select
                                    value={personInCharge}
                                    onChange={(e) => setPersonInCharge(e.target.value)}
                                    style={{ width: '200px' }}
                                >
                                    <option value="">選択してください</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.name}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => handleNavigation('/user-settings')}
                                    className={btnHoverClass}
                                    style={buttonStyle}
                                >
                                    <UserPen size={20} />
                                    担当者マスタ設定
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
