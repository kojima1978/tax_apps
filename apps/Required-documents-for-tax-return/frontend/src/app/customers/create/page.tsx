'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addCustomer, fetchStaff } from '@/utils/api';
import { Staff } from '@/types';
import { ChevronLeft, Loader2, Save, UserPlus, Users } from 'lucide-react';
import Link from 'next/link';
import Toast from '@/components/Toast';
import SearchableSelect from '@/components/SearchableSelect';
import FormErrorDisplay from '@/components/FormErrorDisplay';

export default function CreateCustomerPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [staffId, setStaffId] = useState<number | ''>('');
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [isLoadingStaff, setIsLoadingStaff] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
        visible: false,
        message: '',
        type: 'success'
    });

    // Validation states
    const [touched, setTouched] = useState({ name: false, staffId: false });

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

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ visible: true, message, type });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTouched({ name: true, staffId: true });
        await saveCustomer(true);
    };

    const handleSaveAndAdd = async () => {
        setTouched({ name: true, staffId: true });
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
                setTouched({ name: false, staffId: true }); // Keep staff touched as it remains selected
                showToast('お客様を登録しました。続けて登録できます。');

                // Focus back on name input for keyboard efficiency
                const nameInput = document.getElementById('name-input');
                if (nameInput) nameInput.focus();
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : '登録に失敗しました';
            if (message.includes('already exists')) {
                setError('この担当者に同名のお客様が既に登録されています');
            } else {
                setError(message);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const isNameValid = name.trim().length > 0;
    const isStaffValid = staffId !== '';

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12 transition-colors">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.visible}
                onClose={() => setToast(prev => ({ ...prev, visible: false }))}
            />

            <div className="max-w-xl mx-auto">
                <header className="mb-8">
                    <div className="flex items-center mb-2">
                        <Link href="/customers" className="mr-3 p-2 bg-white rounded-full text-slate-500 hover:text-emerald-600 shadow-sm hover:shadow transition-all group">
                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                        </Link>
                        <h1 className="text-2xl font-bold text-slate-800">お客様 新規登録</h1>
                    </div>
                    <p className="text-slate-500 ml-12 text-sm">
                        新しいお客様情報を登録し、担当者を割り当てます。
                    </p>
                </header>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-80" />

                    <div className="p-8">
                        <FormErrorDisplay error={error} />

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
                                    担当者 <span className="ml-2 text-xs font-normal text-red-500">*必須</span>
                                </label>
                                {isLoadingStaff ? (
                                    <div className="h-12 w-full bg-slate-100 rounded-xl animate-pulse" />
                                ) : (
                                    <div className="relative">
                                        <SearchableSelect
                                            options={staffList.map(staff => ({ value: staff.id, label: staff.staff_name }))}
                                            value={staffId}
                                            onChange={(val) => {
                                                setStaffId(Number(val));
                                                setTouched(prev => ({ ...prev, staffId: true }));
                                            }}
                                            placeholder="担当者を検索・選択"
                                            error={touched.staffId && !isStaffValid}
                                            disabled={isLoadingStaff}
                                        />
                                    </div>
                                )}
                                {touched.staffId && !isStaffValid && (
                                    <p className="mt-2 text-sm text-red-500 animate-in slide-in-from-top-1">
                                        担当者を選択してください
                                    </p>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <Link
                                    href="/customers"
                                    className="order-3 sm:order-1 flex-1 py-3.5 px-6 bg-slate-50 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-all flex items-center justify-center border border-slate-200 hover:border-slate-300"
                                >
                                    キャンセル
                                </Link>
                                <button
                                    type="button"
                                    onClick={handleSaveAndAdd}
                                    disabled={isSubmitting || !isNameValid || !isStaffValid}
                                    className="order-2 sm:order-2 flex-1 py-3.5 px-6 bg-white border-2 border-emerald-600 text-emerald-700 rounded-xl font-bold hover:bg-emerald-50 disabled:border-slate-200 disabled:text-slate-300 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : '保存して追加'}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !isNameValid || !isStaffValid}
                                    className="order-1 sm:order-3 flex-1 py-3.5 px-6 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 hover:shadow-lg hover:-translate-y-0.5 disabled:bg-slate-300 disabled:shadow-none disabled:translate-y-0 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-md bg-gradient-to-br from-emerald-500 to-emerald-700"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                            登録中...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-5 h-5 mr-2" />
                                            完了
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
