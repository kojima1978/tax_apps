'use client';

import { useState, useEffect } from 'react';
import { Staff } from '@/types';
import { fetchStaff, addStaff, updateStaffName, deleteStaff } from '@/utils/api';
import { X, Plus, Trash2, Edit2, Check, Loader2, AlertCircle } from 'lucide-react';

interface StaffManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStaffChange: () => void; // Callback to refresh parent data
}

export default function StaffManagementModal({ isOpen, onClose, onStaffChange }: StaffManagementModalProps) {
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [newStaffName, setNewStaffName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadStaff();
        }
    }, [isOpen]);

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

    const handleAdd = async () => {
        if (!newStaffName.trim()) return;
        setIsAdding(true);
        setError(null);
        try {
            await addStaff(newStaffName);
            setNewStaffName('');
            await loadStaff();
            onStaffChange();
        } catch (e: any) {
            setError(e.message || '追加に失敗しました');
        } finally {
            setIsAdding(false);
        }
    };

    const handleUpdate = async (id: number) => {
        if (!editName.trim()) return;
        setError(null);
        try {
            await updateStaffName(id, editName);
            setEditingId(null);
            setEditName('');
            await loadStaff();
            onStaffChange();
        } catch (e: any) {
            setError(e.message || '更新に失敗しました');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('この担当者を削除してもよろしいですか？\n（現在この担当者に紐づいている顧客がいる場合は削除できません）')) return;
        setError(null);
        try {
            await deleteStaff(id);
            await loadStaff();
            onStaffChange();
        } catch (e: any) {
            setError(e.message || '削除に失敗しました');
        }
    };

    const startEdit = (staff: Staff) => {
        setEditingId(staff.id);
        setEditName(staff.staff_name);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="bg-emerald-600 p-4 flex justify-between items-center text-white">
                    <h2 className="font-bold text-lg">担当者管理</h2>
                    <button onClick={onClose} className="hover:bg-emerald-700 p-1 rounded-full transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center">
                            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="flex mb-6">
                        <input
                            type="text"
                            value={newStaffName}
                            onChange={(e) => setNewStaffName(e.target.value)}
                            placeholder="新しい担当者名"
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                        />
                        <button
                            onClick={handleAdd}
                            disabled={isAdding || !newStaffName.trim()}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-r-lg hover:bg-emerald-700 disabled:opacity-50 font-bold flex items-center"
                        >
                            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto pr-1">
                        {isLoading ? (
                            <div className="text-center py-8 text-slate-400">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                                読み込み中...
                            </div>
                        ) : (
                            <ul className="space-y-2">
                                {staffList.map((staff) => (
                                    <li key={staff.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-emerald-200 transition-colors">
                                        {editingId === staff.id ? (
                                            <div className="flex items-center flex-1 mr-2">
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="flex-1 px-2 py-1 text-sm border border-emerald-500 rounded focus:outline-none"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleUpdate(staff.id);
                                                        if (e.key === 'Escape') setEditingId(null);
                                                    }}
                                                />
                                                <button onClick={() => handleUpdate(staff.id)} className="ml-1 p-1 text-emerald-600 hover:bg-emerald-100 rounded">
                                                    <Check className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setEditingId(null)} className="ml-1 p-1 text-slate-400 hover:bg-slate-200 rounded">
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="font-medium text-slate-700">{staff.staff_name}</span>
                                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => startEdit(staff)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded mr-1">
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleDelete(staff.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </li>
                                ))}
                                {staffList.length === 0 && (
                                    <li className="text-center text-slate-400 py-4 text-sm">担当者が登録されていません</li>
                                )}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
