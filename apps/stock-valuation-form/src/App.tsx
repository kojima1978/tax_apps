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
import { Table7 } from '@/components/tables/Table7';
import { Table8 } from '@/components/tables/Table8';
import type { TableId, TableProps } from '@/types/form';

const TABLE_COMPONENTS: Record<TableId, React.ComponentType<TableProps>> = {
  table1_1: Table1_1,
  table1_2: Table1_2,
  table2: Table2,
  table3: Table3,
  table4: Table4,
  table5: Table5,
  table6: Table6,
  table7: Table7,
  table8: Table8,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TableId>('table1_1');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { getField, updateField } = useFormData();

  const tableProps: TableProps = { getField, updateField, onTabChange: setActiveTab };

  const ActiveTable = TABLE_COMPONENTS[activeTab];

  return (
    <div className="min-h-screen bg-gray-200" style={{ fontFamily: '"Noto Sans JP", sans-serif', display: 'flex' }}>
      {/* 左サイドバー */}
      {sidebarOpen && (
        <aside className="no-print" style={{
          width: 180,
          flexShrink: 0,
          background: '#fff',
          borderRight: '1px solid #ddd',
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: '#333', lineHeight: 1.3 }}>
              取引相場のない株式の<br />評価明細書
            </span>
            <span
              onClick={() => setSidebarOpen(false)}
              style={{ cursor: 'pointer', fontSize: 14, color: '#999', padding: '0 2px' }}
              title="サイドバーを閉じる"
            >✕</span>
          </div>
          <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        </aside>
      )}

      {/* メインコンテンツ */}
      <main style={{ flex: 1, padding: 16, overflowX: 'auto' }}>
        {!sidebarOpen && (
          <button
            className="no-print"
            onClick={() => setSidebarOpen(true)}
            style={{
              background: '#fff',
              border: '1px solid #ccc',
              borderRadius: 4,
              padding: '4px 8px',
              cursor: 'pointer',
              fontSize: 12,
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
            title="サイドバーを開く"
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>☰</span>
            <span>メニュー</span>
          </button>
        )}
        <div className="gov-page">
          <ActiveTable {...tableProps} />
        </div>
      </main>
    </div>
  );
}
