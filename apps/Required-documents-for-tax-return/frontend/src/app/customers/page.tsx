'use client';

import { useState, useEffect } from 'react';
import { Customer } from '@/types';
import { fetchCustomers, deleteCustomer } from '@/utils/api';
import { Plus, Trash2, Edit2, Loader2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function CustomerListPage() {
    const [customerList, setCustomerList] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadCustomers();
    }, []);

    const loadCustomers = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchCustomers();
            setCustomerList(data);
        } catch (e) {
            console.error(e);
            setError('お客様リストの取得に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('このお客様を削除してもよろしいですか？\n※関連する保存データも全て削除されます。')) return;
        setError(null);
        try {
            await deleteCustomer(id);
            await loadCustomers();
        } catch (e: any) {
            setError(e.message || '削除に失敗しました');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-2xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <div className="flex items-center">
                        <Link href="/" className="mr-4 p-2 bg-white rounded-full text-slate-500 hover:text-emerald-600 shadow-sm hover:shadow transition-all">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-2xl font-bold text-slate-800">お客様管理</h1>
                    </div>
                    <Link
                        href="/customers/create"
                        className="flex items-center px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all"
                    >
                        <Plus className="w-5 h-5 mr-1.5" />
                        新規登録
                    </Link>
                </header>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl">
                        {error}
                    </div>
                )}

                {isLoading ? (
                    <div className="flex justify-center py-12 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin" />
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {customerList.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                お客様が登録されていません
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {customerList.map((customer) => (
                                    <li key={customer.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div>
                                            <div className="font-bold text-slate-700">{customer.customer_name}</div>
                                            <div className="text-xs text-slate-500">担当: {customer.staff_name}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={`/customers/${customer.id}/edit`}
                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(customer.id)}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
