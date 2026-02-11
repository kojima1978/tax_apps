'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addStaff } from '@/utils/api';
import { getErrorMessage } from '@/utils/error';
import { ChevronLeft, Loader2, Save, User, Phone, UserPlus } from 'lucide-react';
import Link from 'next/link';
import FormErrorDisplay from '@/components/FormErrorDisplay';

export default function CreateStaffPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Validation state
    const [touched, setTouched] = useState({ name: false });

    const saveStaff = async (redirectTo: 'staff' | 'customer') => {
        setTouched({ name: true });
        if (!name.trim()) return;

        setIsSubmitting(true);
        setError(null);
        try {
            const staff = await addStaff(name, mobileNumber);
            if (redirectTo === 'customer') {
                router.push(`/customers/create?staffId=${staff.id}`);
            } else {
                router.push('/staff');
            }
        } catch (e: unknown) {
            setError(getErrorMessage(e, '登録に失敗しました'));
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await saveStaff('staff');
    };

    const isNameValid = name.trim().length > 0;

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12 transition-colors">
            <div className="max-w-xl mx-auto">
                <header className="mb-8">
                    <div className="flex items-center mb-2">
                        <Link href="/staff" className="mr-3 p-2 bg-white rounded-full text-slate-500 hover:text-emerald-600 shadow-sm hover:shadow transition-all group">
                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
                        </Link>
                        <h1 className="text-2xl font-bold text-slate-800">担当者 新規登録</h1>
                    </div>
                    <div className="ml-12 flex items-center gap-4">
                        <p className="text-slate-500 text-sm">
                            新しい担当者をシステムに登録します。
                        </p>
                        <Link href="/customers/create" className="inline-flex items-center text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors whitespace-nowrap">
                            <UserPlus className="w-3.5 h-3.5 mr-1" />
                            お客様登録
                        </Link>
                    </div>
                </header>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-1 bg-gradient-to-r from-emerald-500 to-teal-400 opacity-80" />

                    <div className="p-8">
                        <FormErrorDisplay error={error} />

                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div>
                                <label htmlFor="name-input" className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                                    <User className="w-4 h-4 mr-2 text-emerald-600" />
                                    担当者名 <span className="ml-2 text-xs font-normal text-red-500">*必須</span>
                                </label>
                                <input
                                    id="name-input"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onBlur={() => setTouched({ name: true })}
                                    placeholder="例：山田 太郎"
                                    className={`w-full px-4 py-3.5 border rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-base
                                        ${touched.name && !isNameValid
                                            ? 'border-red-300 bg-red-50 focus:border-red-500'
                                            : 'border-slate-200 focus:border-emerald-500'}`}
                                    autoFocus
                                />
                                {touched.name && !isNameValid && (
                                    <p className="mt-2 text-sm text-red-500 animate-in slide-in-from-top-1">
                                        担当者名を入力してください
                                    </p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="mobile-input" className="block text-sm font-bold text-slate-700 mb-2 flex items-center">
                                    <Phone className="w-4 h-4 mr-2 text-emerald-600" />
                                    携帯電話番号 <span className="ml-2 text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">任意</span>
                                </label>
                                <input
                                    id="mobile-input"
                                    type="text"
                                    value={mobileNumber}
                                    onChange={(e) => setMobileNumber(e.target.value)}
                                    placeholder="例：090-1234-5678"
                                    className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-base"
                                />
                                <p className="mt-2 text-xs text-slate-400">
                                    ※ハイフン（-）あり・なしどちらでも登録可能です
                                </p>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <Link
                                    href="/staff"
                                    className="order-3 sm:order-1 flex-1 py-3.5 px-6 bg-slate-50 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-all flex items-center justify-center border border-slate-200 hover:border-slate-300"
                                >
                                    キャンセル
                                </Link>
                                <button
                                    type="button"
                                    onClick={() => saveStaff('customer')}
                                    disabled={isSubmitting || !isNameValid}
                                    className="order-2 sm:order-2 flex-1 py-3.5 px-6 bg-white border-2 border-emerald-600 text-emerald-700 rounded-xl font-bold hover:bg-emerald-50 disabled:border-slate-200 disabled:text-slate-300 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                                >
                                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                        <>
                                            <UserPlus className="w-5 h-5 mr-2" />
                                            続けてお客様登録
                                        </>
                                    )}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting || !isNameValid}
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
                                            登録
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
