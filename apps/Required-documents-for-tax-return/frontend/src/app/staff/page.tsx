'use client';

import { useState, useEffect } from 'react';
import { Staff } from '@/types';
import { fetchStaff, deleteStaff } from '@/utils/api';
import { Plus, Trash2, Edit2, Loader2, ChevronLeft, Phone } from 'lucide-react';
import Link from 'next/link';

export default function StaffListPage() {
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadStaff();
    }, []);

    const loadStaff = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await fetchStaff();
            setStaffList(data);
        } catch (e) {
            console.error(e);
            setError('担当者リストの取得に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('この担当者を削除してもよろしいですか？\n（現在この担当者に紐づいている顧客がいる場合は削除できません）')) return;
        setError(null);
        try {
            await deleteStaff(id);
            await loadStaff();
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
                        <h1 className="text-2xl font-bold text-slate-800">担当者管理</h1>
                    </div>
                    <Link
                        href="/staff/create"
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
                        {staffList.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                担当者が登録されていません
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {staffList.map((staff) => (
                                    <li key={staff.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold mr-4">
                                                {staff.staff_name.charAt(0)}
                                            </div>
                                            <div>
                                                <span className="font-bold text-slate-700">{staff.staff_name}</span>
                                                {staff.mobile_number && (
                                                    <span className="ml-3 text-xs text-slate-400 inline-flex items-center">
                                                        <Phone className="w-3 h-3 mr-1" />
                                                        {staff.mobile_number}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={`/staff/${staff.id}/edit`}
                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(staff.id)}
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
