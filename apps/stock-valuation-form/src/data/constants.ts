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
  { id: 'table4_1', label: '第４表の１', subtitle: '比準要素の金額' },
  { id: 'table4_2', label: '第４表の２', subtitle: '類似業種比準価額' },
  { id: 'table5', label: '第５表', subtitle: '純資産価額' },
  { id: 'table6', label: '第６表', subtitle: '特定の評価会社' },
  { id: 'table7_1', label: '第７表の１', subtitle: '受取配当収受割合' },
  { id: 'table7_2', label: '第７表の２', subtitle: 'S1類似業種比準' },
  { id: 'table7_3', label: '第７表の３', subtitle: 'S1純資産・S2' },
];
