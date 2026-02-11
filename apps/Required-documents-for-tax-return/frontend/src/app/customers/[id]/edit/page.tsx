'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { fetchStaff, fetchCustomers, updateCustomerName } from '@/utils/api';
import { getErrorMessage } from '@/utils/error';
import { Staff } from '@/types';
import { ChevronLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';
import FormErrorDisplay from '@/components/FormErrorDisplay';

export default function EditCustomerPage() {
    const router = useRouter();
    const params = useParams();
    const id = Number(params.id);

    const [name, setName] = useState('');
    const [staffId, setStaffId] = useState<number | ''>('');
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                if (target.staff_id) {
                    setStaffId(target.staff_id);
                } else {
                    const staff = staffData.find(s => s.staff_name === target.staff_name);
                    if (staff) setStaffId(staff.id);
                }
            } else {
                setError('お客様が見つかりませんでした');
            }
        } catch (e) {
            setError('データの取得に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !staffId) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await updateCustomerName(id, name, Number(staffId));
            router.push('/customers');
        } catch (e: unknown) {
            const message = getErrorMessage(e, '更新に失敗しました');
            if (message.includes('already exists')) {
                setError('この担当者に同名のお客様が既に登録されています');
            } else {
                setError(message);
            }
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-xl mx-auto">
                <header className="mb-8 flex items-center">
                    <Link href="/customers" className="mr-4 p-2 bg-white rounded-full text-slate-500 hover:text-emerald-600 shadow-sm hover:shadow transition-all">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-800">お客様 編集</h1>
                </header>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                    <FormErrorDisplay error={error} />

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
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
                                担当者
                            </label>
                            <select
                                value={staffId}
                                onChange={(e) => setStaffId(e.target.value ? Number(e.target.value) : '')}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-white"
                            >
                                <option value="">選択してください</option>
                                {staffList.map((staff) => (
                                    <option key={staff.id} value={staff.id}>
                                        {staff.staff_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !name.trim() || !staffId}
                            className="w-full py-3.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-md transition-all flex items-center justify-center"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    保存中...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5 mr-2" />
                                    変更を保存
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
