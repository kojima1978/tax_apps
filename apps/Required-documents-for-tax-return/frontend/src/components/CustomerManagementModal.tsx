import { useState, useEffect } from 'react';
import { Customer, Staff } from '@/types';
import { fetchStaff, fetchCustomers, addCustomer, updateCustomerName, deleteCustomer } from '@/utils/api';
import { X, Plus, Trash2, Edit2, Check, AlertCircle } from 'lucide-react';

interface CustomerManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCustomerChange: (newCustomerName?: string) => void;
    defaultStaffId?: number;
}

export default function CustomerManagementModal({
    isOpen,
    onClose,
    onCustomerChange,
    defaultStaffId
}: CustomerManagementModalProps) {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [newCustomerName, setNewCustomerName] = useState('');
    const [newCustomerStaffId, setNewCustomerStaffId] = useState<number | ''>('');
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editStaffId, setEditStaffId] = useState<number | ''>('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadData();
            if (defaultStaffId) {
                setNewCustomerStaffId(defaultStaffId);
            }
        }
    }, [isOpen, defaultStaffId]);

    const loadData = async () => {
        // ... (existing loadData logic is fine, no change needed here but keeping context)
        setIsLoading(true);
        try {
            const [customersData, staffData] = await Promise.all([
                fetchCustomers(),
                fetchStaff()
            ]);
            setCustomers(customersData);
            setStaffList(staffData);
            setError(null);
        } catch (err) {
            setError('データの読み込みに失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!newCustomerName.trim() || !newCustomerStaffId) return;

        try {
            await addCustomer(newCustomerName.trim(), Number(newCustomerStaffId));
            const addedName = newCustomerName.trim();
            setNewCustomerName('');
            // Keep the staff selected for consecutive adds
            // setNewCustomerStaffId(''); 
            await loadData();
            onCustomerChange(addedName);
            onClose(); // Close modal on success for better flow? User requested "select", so maybe close and select is best?
            // User request was "make it selectable", implies auto-select.
            // If I close, it feels like "done". If I stay open, they might add more.
            // Let's close it to verify the selection work. Or better, just notify.
            // Actually, keep it open is standard for "Management" modals, but for "Add" flow...
            // Let's keep it open but maybe clear the name.
            // Re-read user request: "新規登録したお客様を選択できるようにしてください" (Please make it possible to select the newly registered customer)
            // This usually means "Auto-select it in the parent dropdown".
            // If I close the modal, it's definitely "Select it now".
            // Let's close the modal if it was triggered for a single add?
            // Hard to know intent. Let's just return the name.
            // I'll close the modal because usually inline add is for "I want to use this NOW".
            onClose();
        } catch (e: any) {
            if (e.message && e.message.includes('already exists')) {
                setError('この担当者に同名のお客様が既に登録されています');
            } else {
                setError(e.message || '追加に失敗しました');
            }
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('このお客様を削除してもよろしいですか？\n※関連する保存データも全て削除されます。')) return;

        try {
            await deleteCustomer(id);
            await loadData();
            onCustomerChange();
        } catch (e: any) {
            alert(e.message || '削除に失敗しました');
        }
    };

    const startEdit = (customer: Customer) => {
        setEditingId(customer.id);
        setEditName(customer.customer_name);
        setEditStaffId(customer.staff_id || '');
    };

    const saveEdit = async () => {
        if (editingId === null || !editName.trim() || !editStaffId) return;

        try {
            await updateCustomerName(editingId, editName.trim(), Number(editStaffId));
            setEditingId(null);
            await loadData();
            onCustomerChange();
        } catch (e: any) {
            alert(e.message || '更新に失敗しました');
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
        setEditStaffId('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-fade-in">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">お客様管理</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg flex items-center text-sm">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            {error}
                        </div>
                    )}

                    {/* 新規追加フォーム */}
                    <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-700 mb-3">新規にお客様を登録</h3>
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={newCustomerName}
                                    onChange={(e) => setNewCustomerName(e.target.value)}
                                    placeholder="お客様名"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="w-1/3">
                                <select
                                    value={newCustomerStaffId}
                                    onChange={(e) => setNewCustomerStaffId(e.target.value ? Number(e.target.value) : '')}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="">担当者を選択</option>
                                    {staffList.map(s => (
                                        <option key={s.id} value={s.id}>{s.staff_name}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={handleAdd}
                                disabled={!newCustomerName.trim() || !newCustomerStaffId}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-slate-300 font-bold whitespace-nowrap"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h3 className="text-sm font-bold text-slate-500 mb-2">登録済みのお客様 ({customers.length})</h3>

                        {isLoading ? (
                            <div className="text-center py-8 text-slate-400">読み込み中...</div>
                        ) : customers.length === 0 ? (
                            <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                お客様が登録されていません
                            </div>
                        ) : (
                            customers.map((customer) => (
                                <div
                                    key={customer.id}
                                    className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-emerald-200 transition-colors group"
                                >
                                    {editingId === customer.id ? (
                                        <div className="flex items-center flex-1 gap-2">
                                            <input
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                className="flex-1 px-3 py-1.5 border border-emerald-500 rounded text-sm focus:outline-none"
                                                autoFocus
                                            />
                                            <select
                                                value={editStaffId}
                                                onChange={(e) => setEditStaffId(Number(e.target.value))}
                                                className="w-1/3 px-3 py-1.5 border border-emerald-500 rounded text-sm focus:outline-none"
                                            >
                                                {staffList.map(s => (
                                                    <option key={s.id} value={s.id}>{s.staff_name}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={saveEdit}
                                                className="p-1.5 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200"
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="p-1.5 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex-1">
                                                <div className="font-bold text-slate-700">{customer.customer_name}</div>
                                                <div className="text-xs text-slate-500">担当: {customer.staff_name}</div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => startEdit(customer)}
                                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(customer.id)}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
