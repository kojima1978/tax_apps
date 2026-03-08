import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchStaff, updateStaffName } from '@/utils/api';
import { getErrorMessage } from '@/utils/error';
import FullScreenLoader from '@/components/FullScreenLoader';
import SubmitButton from '@/components/SubmitButton';
import { FormPageLayout } from '@/components/FormPageLayout';

export default function EditStaffPage() {
    const navigate = useNavigate();
    const params = useParams();
    const id = Number(params.id);

    const [name, setName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const staffList = await fetchStaff();
            const target = staffList.find(s => s.id === id);
            if (target) {
                setName(target.staff_name);
                setMobileNumber(target.mobile_number || '');
            } else {
                setError('担当者が見つかりませんでした');
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
            await updateStaffName(id, name, mobileNumber);
            navigate('/staff');
        } catch (e: unknown) {
            setError(getErrorMessage(e, '更新に失敗しました'));
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <FullScreenLoader />;

    return (
        <FormPageLayout
            backTo="/staff"
            title="担当者 編集"
            error={error}
        >
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                        担当者名
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
                        携帯電話番号 <span className="text-xs font-normal text-slate-500">（任意）</span>
                    </label>
                    <input
                        type="text"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="例：090-1234-5678"
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                    />
                </div>

                <SubmitButton
                    isSubmitting={isSubmitting}
                    disabled={isSubmitting || !name.trim()}
                    submitLabel="変更を保存"
                    submittingLabel="保存中..."
                    className="w-full py-3.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-md transition-all flex items-center justify-center"
                />
            </form>
        </FormPageLayout>
    );
}
