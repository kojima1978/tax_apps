export type TableId =
  | 'table1_1'
  | 'table1_2'
  | 'table2'
  | 'table3'
  | 'table4'
  | 'table4_1'
  | 'table4_2'
  | 'table5'
  | 'table6'
  | 'table7'
  | 'table7_1'
  | 'table7_2'
  | 'table7_3'
  | 'table8';

export interface FormData {
  table1_1: Record<string, string>;
  table1_2: Record<string, string>;
  table2: Record<string, string>;
  table3: Record<string, string>;
  // table4 は第4表の1／第4表の2の共通データバケット（両画面とも formId='table4'）。
  table4: Record<string, string>;
  table4_1: Record<string, string>;
  table4_2: Record<string, string>;
  table5: Record<string, string>;
  table6: Record<string, string>;
  // table7 は第7表の1／第7表の2の共通データバケット（両画面とも formId='table7'）。
  table7: Record<string, string>;
  table7_1: Record<string, string>;
  table7_2: Record<string, string>;
  table7_3: Record<string, string>;
  table8: Record<string, string>;
}

export interface TableProps {
  getField: (table: TableId, field: string) => string;
  updateField: (table: TableId, field: string, value: string) => void;
  onTabChange?: (tab: TableId) => void;
  /** 自動転記欄をクリックしたとき、入力元の表・フィールドへ移動する */
  onJump?: (target: { tab: TableId; field: string }) => void;
}

export const initialFormData: FormData = {
  table1_1: {},
  table1_2: {},
  table2: {},
  table3: {},
  table4: {},
  table4_1: {},
  table4_2: {},
  table5: {},
  table6: {},
  table7: {},
  table7_1: {},
  table7_2: {},
  table7_3: {},
  table8: {},
};
