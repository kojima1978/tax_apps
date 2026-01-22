'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addStaff } from '@/utils/api';
import { ChevronLeft, Loader2, Save } from 'lucide-react';
import Link from 'next/link';

export default function CreateStaffPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsSubmitting(true);
        setError(null);
        try {
            await addStaff(name);
            router.push('/staff');
        } catch (e: any) {
            setError(e.message || '登録に失敗しました');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-xl mx-auto">
                <header className="mb-8 flex items-center">
                    <Link href="/staff" className="mr-4 p-2 bg-white rounded-full text-slate-500 hover:text-emerald-600 shadow-sm hover:shadow transition-all">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-2xl font-bold text-slate-800">担当者 新規登録</h1>
                </header>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-8">
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                担当者名
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="例：山田 太郎"
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                autoFocus
                            />
                        </div>

                        <div className="flex gap-4">
                            <Link
                                href="/staff"
                                className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-all flex items-center justify-center"
                            >
                                キャンセル
                            </Link>
                            <button
                                type="submit"
                                disabled={isSubmitting || !name.trim()}
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
