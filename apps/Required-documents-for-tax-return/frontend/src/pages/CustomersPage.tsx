import { Customer } from '@/types';
import { fetchCustomers, deleteCustomer } from '@/utils/api';
import ListPage from '@/components/ListPage';

export default function CustomerListPage() {
    return (
        <ListPage<Customer>
            title="お客様管理"
            backHref="/"
            createHref="/customers/create"
            editHref={(id) => `/customers/${id}/edit`}
            emptyMessage="お客様が登録されていません"
            loadErrorMessage="お客様リストの取得に失敗しました"
            deleteConfirmMessage={() => 'このお客様を削除してもよろしいですか？\n※関連する保存データも全て削除されます。'}
            onLoad={fetchCustomers}
            onDelete={deleteCustomer}
            renderItem={(customer) => (
                <div>
                    <div className="font-bold text-slate-700">
                        {customer.customer_name}
                        {customer.customer_code && (
                            <span className="ml-2 text-xs text-slate-400 font-mono">#{customer.customer_code}</span>
                        )}
                    </div>
                    <div className="text-xs text-slate-500">担当: {customer.staff_name || '未設定'}</div>
                </div>
            )}
        />
    );
}
