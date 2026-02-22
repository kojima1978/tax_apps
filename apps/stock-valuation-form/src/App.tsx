import { useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { useFormData } from '@/hooks/useFormData';
import { Table1_1 } from '@/components/tables/Table1_1';
import { Table1_2 } from '@/components/tables/Table1_2';
import { Table2 } from '@/components/tables/Table2';
import { Table3 } from '@/components/tables/Table3';
import { Table4 } from '@/components/tables/Table4';
import { Table5 } from '@/components/tables/Table5';
import { Table6 } from '@/components/tables/Table6';
import { Table7_8 } from '@/components/tables/Table7_8';
import type { TableId } from '@/types/form';

export default function App() {
  const [activeTab, setActiveTab] = useState<TableId>('table1_1');
  const { getField, updateField } = useFormData();

  const tableProps = {
    getField: (table: TableId, field: string) => getField(table, field),
    updateField: (table: TableId, field: string, value: string) =>
      updateField(table, field, value),
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4" style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
      <div className="max-w-[210mm] mx-auto">
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'table1_1' && <Table1_1 {...tableProps} />}
        {activeTab === 'table1_2' && <Table1_2 {...tableProps} />}
        {activeTab === 'table2' && <Table2 {...tableProps} />}
        {activeTab === 'table3' && <Table3 {...tableProps} />}
        {activeTab === 'table4' && <Table4 {...tableProps} />}
        {activeTab === 'table5' && <Table5 {...tableProps} />}
        {activeTab === 'table6' && <Table6 {...tableProps} />}
        {activeTab === 'table7_8' && <Table7_8 {...tableProps} />}
      </div>
    </div>
  );
}
