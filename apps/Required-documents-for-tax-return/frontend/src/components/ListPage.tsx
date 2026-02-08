'use client';

import { useState, useEffect, ReactNode } from 'react';
import { Plus, Trash2, Edit2, Loader2, ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface ListPageProps<T extends { id: number }> {
    title: string;
    backHref: string;
    createHref: string;
    editHref: (id: number) => string;
    emptyMessage: string;
    loadErrorMessage: string;
    deleteConfirmMessage: (item: T) => string;
    onLoad: () => Promise<T[]>;
    onDelete: (id: number) => Promise<void>;
    renderItem: (item: T) => ReactNode;
}

export default function ListPage<T extends { id: number }>({
    title,
    backHref,
    createHref,
    editHref,
    emptyMessage,
    loadErrorMessage,
    deleteConfirmMessage,
    onLoad,
    onDelete,
    renderItem,
}: ListPageProps<T>) {
    const [items, setItems] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await onLoad();
            setItems(data);
        } catch {
            setError(loadErrorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (item: T) => {
        if (!confirm(deleteConfirmMessage(item))) return;
        setError(null);
        try {
            await onDelete(item.id);
            await loadItems();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : '削除に失敗しました');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-2xl mx-auto">
                <header className="mb-8 flex items-center justify-between">
                    <div className="flex items-center">
                        <Link href={backHref} className="mr-4 p-2 bg-white rounded-full text-slate-500 hover:text-emerald-600 shadow-sm hover:shadow transition-all">
                            <ChevronLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
                    </div>
                    <Link
                        href={createHref}
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
                        {items.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                {emptyMessage}
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {items.map((item) => (
                                    <li key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        {renderItem(item)}
                                        <div className="flex items-center gap-2">
                                            <Link
                                                href={editHref(item.id)}
                                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                            >
                                                <Edit2 className="w-5 h-5" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(item)}
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
