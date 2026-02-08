'use client';

import { Staff } from '@/types';
import { fetchStaff, deleteStaff } from '@/utils/api';
import { Phone } from 'lucide-react';
import ListPage from '@/components/ListPage';

export default function StaffListPage() {
    return (
        <ListPage<Staff>
            title="担当者管理"
            backHref="/"
            createHref="/staff/create"
            editHref={(id) => `/staff/${id}/edit`}
            emptyMessage="担当者が登録されていません"
            loadErrorMessage="担当者リストの取得に失敗しました"
            deleteConfirmMessage={() => 'この担当者を削除してもよろしいですか？\n（現在この担当者に紐づいている顧客がいる場合は削除できません）'}
            onLoad={fetchStaff}
            onDelete={deleteStaff}
            renderItem={(staff) => (
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
            )}
        />
    );
}
