import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { fetchStaff, fetchCustomers, updateCustomerName } from '@/utils/api';
import { translateCustomerError } from '@/utils/error';
import { Staff } from '@/types';
import SubmitButton from '@/components/SubmitButton';
import CodeInput from '@/components/CodeInput';
import FullScreenLoader from '@/components/FullScreenLoader';
import { FormPageLayout } from '@/components/FormPageLayout';
import { useInlineStaffCreation } from '@/hooks/useInlineStaffCreation';
import { InlineStaffToggle, InlineStaffForm } from '@/components/InlineStaffForm';

export default function EditCustomerPage() {
    const navigate = useNavigate();
    const params = useParams();
    const [searchParams] = useSearchParams();
    const id = Number(params.id);
    const returnTo = searchParams.get('returnTo');

    const [name, setName] = useState('');
    const [customerCode, setCustomerCode] = useState('');
    const [staffId, setStaffId] = useState<number | ''>('');
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleStaffCreated = useCallback((staff: Staff) => {
        setStaffList(prev => [...prev, staff].sort((a, b) => a.staff_name.localeCompare(b.staff_name)));
        setStaffId(staff.id);
    }, []);
    const inlineStaff = useInlineStaffCreation({ onCreated: handleStaffCreated });

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [customers, staffData] = await Promise.all([
                fetchCustomers(),
                fetchStaff()
            ]);
            setStaffList(staffData);

            const target = customers.find(c => c.id === id);
            if (target) {
                setName(target.customer_name);
                setCustomerCode(target.customer_code || '');
                if (target.staff_id) {
                    setStaffId(target.staff_id);
                }
            } else {
                setError('お客様が見つかりませんでした');
            }
        } catch {
            setError('データの取得に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await updateCustomerName(id, name, staffId || null, customerCode.trim() || undefined);
            navigate(returnTo || `/customers/${id}`);
        } catch (e: unknown) {
            setError(translateCustomerError(e, '更新に失敗しました'));
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <FullScreenLoader />;

    return (
        <FormPageLayout
            backTo={returnTo || `/customers/${id}`}
            title="お客様 編集"
            error={error}
        >
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <CodeInput label="お客様コード" value={customerCode} onChange={setCustomerCode} maxLength={4} placeholder="例：0001" variant="compact" />
                </div>

                <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        お客様名
                    </label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                </div>

                <div className="mb-8">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        担当者 <span className="ml-2 text-xs font-normal text-slate-400">任意</span>
                    </label>
                    <select
                        value={staffId}
                        onChange={(e) => setStaffId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                    >
                        <option value="">未設定</option>
                        {staffList.map((staff) => (
                            <option key={staff.id} value={staff.id}>
                                {staff.staff_name}
                            </option>
                        ))}
                    </select>

                    <InlineStaffToggle staff={inlineStaff} />
                    <InlineStaffForm staff={inlineStaff} />
                </div>

                <SubmitButton
                    isSubmitting={isSubmitting}
                    disabled={isSubmitting || !name.trim()}
                    submitLabel="変更を保存"
                    submittingLabel="保存中..."
                />
            </form>
        </FormPageLayout>
    );
}
