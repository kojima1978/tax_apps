'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addCustomer, fetchStaff } from '@/utils/api';
import { Staff } from '@/types';
import { ChevronLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';

export default function CreateCustomerPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [staffId, setStaffId] = useState<number | ''>('');
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [isLoadingStaff, setIsLoadingStaff] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStaff();
    }, []);

    const loadStaff = async () => {
        try {
            const data = await fetchStaff();
            setStaffList(data);
        } catch (e) {
            console.error(e);
            setError('担当者リストの取得に失敗しました');
        } finally {
            setIsLoadingStaff(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await saveCustomer(true);
    };

    const handleSaveAndAdd = async () => {
        await saveCustomer(false);
    };

    const saveCustomer = async (shouldRedirect: boolean) => {
        if (!name.trim() || !staffId) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await addCustomer(name, Number(staffId));
            if (shouldRedirect) {
                router.push('/customers');
            } else {
                setName('');
                // Keep staffId selected for convenience
                setIsSubmitting(false);
                // Optional: Show success feedback?
                alert('登録しました。続けて登録できます。');
            }
        } catch (e: any) {
            if (e.message && e.message.includes('already exists')) {
                setError('この担当者に同名のお客様が既に登録されています');
            } else {
                setError(e.message || '登録に失敗しました');
            }
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-xl mx-auto">
                <header className="mb-8 flex items-center">
                    <Link href="/customers" className="mr-4 p-2 bg-white rounded-full text-slate-500 hover:text-emerald-600 shadow-sm hover:shadow transition-all">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-800">お客様 新規登録</h1>
                </header>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                お客様名
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="例：日本 太郎"
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                autoFocus
                            />
                        </div>

                        <div className="mb-8">
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                担当者
                            </label>
                            {isLoadingStaff ? (
                                <div className="text-slate-400 text-sm">読み込み中...</div>
                            ) : (
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
                            )}
                        </div>

                        <div className="flex gap-4">
                            <Link
                                href="/customers"
                                className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-all flex items-center justify-center"
                            >
                                キャンセル
                            </Link>
                            <button
                                type="button"
                                onClick={handleSaveAndAdd}
                                disabled={isSubmitting || !name.trim() || !staffId}
                                className="flex-1 py-3.5 bg-white border-2 border-emerald-600 text-emerald-600 rounded-lg font-bold hover:bg-emerald-50 disabled:border-slate-300 disabled:text-slate-300 disabled:bg-white disabled:cursor-not-allowed transition-all"
                            >
                                保存して追加
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !name.trim() || !staffId}
                                className="flex-1 py-3.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-md transition-all flex items-center justify-center"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                        登録中...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-5 h-5 mr-2" />
                                        保存する
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
