import type { TableId } from '@/types/form';

export interface TabDef {
  id: TableId;
  label: string;
  subtitle: string;
}

export const TABS: TabDef[] = [
  { id: 'table1_1', label: '第１表の１', subtitle: '株主判定・会社規模' },
  { id: 'table1_2', label: '第１表の２', subtitle: '会社規模（続）' },
  { id: 'table2', label: '第２表', subtitle: '特定の評価会社' },
  { id: 'table3', label: '第３表', subtitle: '一般の評価会社' },
  { id: 'table4', label: '第４表', subtitle: '類似業種比準' },
  { id: 'table5', label: '第５表', subtitle: '純資産価額' },
  { id: 'table6', label: '第６表', subtitle: '特定の評価会社' },
  { id: 'table7_8', label: '第７・８表', subtitle: '株式保有特定会社' },
];
