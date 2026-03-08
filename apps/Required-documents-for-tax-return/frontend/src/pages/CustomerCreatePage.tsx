import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { addCustomer, fetchStaff } from '@/utils/api';
import { translateCustomerError } from '@/utils/error';
import { Staff } from '@/types';
import { Users, UserPlus } from 'lucide-react';
import SearchableSelect from '@/components/SearchableSelect';
import SubmitButton from '@/components/SubmitButton';
import { FormPageLayout } from '@/components/FormPageLayout';

export default function CreateCustomerPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [name, setName] = useState('');
    const [staffId, setStaffId] = useState<number | ''>('');
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [isLoadingStaff, setIsLoadingStaff] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [touched, setTouched] = useState({ name: false });

    useEffect(() => {
        loadStaff();
    }, []);

    const loadStaff = async () => {
        try {
            const data = await fetchStaff();
            setStaffList(data);

            const paramStaffId = searchParams.get('staffId');
            if (paramStaffId) {
                const id = Number(paramStaffId);
                if (data.some(s => s.id === id)) {
                    setStaffId(id);
                }
            }
        } catch {
            setError('担当者リストの取得に失敗しました');
        } finally {
            setIsLoadingStaff(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ name: true });
        if (!name.trim()) return;

        setIsSubmitting(true);
        setError(null);
        try {
            const customer = await addCustomer(name, staffId || null);
            navigate(`/customers/${customer.id}`);
        } catch (e: unknown) {
            setError(translateCustomerError(e, '登録に失敗しました'));
            setIsSubmitting(false);
        }
    };

    const isNameValid = name.trim().length > 0;

    return (
        <FormPageLayout
            backTo="/customers"
            title="お客様 新規登録"
            description="新しいお客様情報を登録します。担当者は後から設定できます。"
            error={error}
            withAccent
        >
            <form onSubmit={handleSubmit} className="space-y-8">
                <div>
                    <label htmlFor="name-input" className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                        <Users className="w-4 h-4 mr-2 text-emerald-600" />
                        お客様名 <span className="ml-2 text-xs font-normal text-red-500">*必須</span>
                    </label>
                    <input
                        id="name-input"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                        placeholder="例：日本 太郎"
                        className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-base
                            ${touched.name && !isNameValid
                                ? 'border-red-300 bg-red-50 focus:border-red-500'
                                : 'border-slate-200 focus:border-emerald-500'}`}
                        autoFocus
                    />
                    {touched.name && !isNameValid && (
                        <p className="mt-2 text-sm text-red-500 animate-in slide-in-from-top-1">
                            お客様名を入力してください
                        </p>
                    )}
                </div>

                <div>
                    <label htmlFor="staff-select" className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                        <UserPlus className="w-4 h-4 mr-2 text-emerald-600" />
                        担当者 <span className="ml-2 text-xs font-normal text-slate-400">任意</span>
                    </label>
                    {isLoadingStaff ? (
                        <div className="h-12 w-full bg-slate-100 rounded-xl animate-pulse" />
                    ) : (
                        <div className="relative">
                            <SearchableSelect
                                options={staffList.map(staff => ({ value: staff.id, label: staff.staff_name }))}
                                value={staffId}
                                onChange={(val) => {
                                    setStaffId(val ? Number(val) : '');
                                }}
                                placeholder="担当者を選択（後から設定可能）"
                                error={false}
                                disabled={isLoadingStaff}
                            />
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                    <Link
                        to="/customers"
                        className="order-2 sm:order-1 flex-1 py-3.5 px-6 bg-slate-50 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-all flex items-center justify-center border border-slate-200 hover:border-slate-300"
                    >
                        キャンセル
                    </Link>
                    <SubmitButton
                        isSubmitting={isSubmitting}
                        disabled={isSubmitting || !isNameValid}
                        submitLabel="登録"
                        submittingLabel="登録中..."
                        className="order-1 sm:order-2 flex-1 py-3.5 px-6 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5 disabled:bg-slate-300 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-md bg-gradient-to-br from-emerald-500 to-emerald-700"
                    />
                </div>
            </form>
        </FormPageLayout>
    );
}
