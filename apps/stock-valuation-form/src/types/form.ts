export type TableId =
  | 'table1_1'
  | 'table1_2'
  | 'table2'
  | 'table3'
  | 'table4'
  | 'table5'
  | 'table6'
  | 'table7'
  | 'table8';

export interface FormData {
  table1_1: Record<string, string>;
  table1_2: Record<string, string>;
  table2: Record<string, string>;
  table3: Record<string, string>;
  table4: Record<string, string>;
  table5: Record<string, string>;
  table6: Record<string, string>;
  table7: Record<string, string>;
  table8: Record<string, string>;
}

export interface TableProps {
  getField: (table: TableId, field: string) => string;
  updateField: (table: TableId, field: string, value: string) => void;
  onTabChange?: (tab: TableId) => void;
}

export const initialFormData: FormData = {
  table1_1: {},
  table1_2: {},
  table2: {},
  table3: {},
  table4: {},
  table5: {},
  table6: {},
  table7: {},
  table8: {},
};
