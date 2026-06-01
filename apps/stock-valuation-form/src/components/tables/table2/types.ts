export type GFn = (field: string) => string;
export type UFn = (field: string, value: string) => void;

export interface SectionProps {
  g: GFn;
  u: UFn;
  /** 第1表の1からフィールドを取得 */
  getField: (table: string, field: string) => string;
}
