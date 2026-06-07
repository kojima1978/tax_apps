import { FormOverlay, type OverlayField } from '@/components/ui/FormOverlay';
import type { TableProps } from '@/types/form';

const T = 'table2' as const;
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const IMAGE = `${BASE}/forms/table2.png`;

/** 座標登録中は true（測定パネル表示）、完成後 false */
const PICKER = true;

/** 確定済みの固定欄（グリッドはピッカーの登録リストから生成するため通常は空） */
const FIELDS: OverlayField[] = [];

/** 第2表（背景画像オーバーレイ／CSSグリッド方式・測定用） */
export function Table2({ getField, updateField }: TableProps) {
  const g = (f: string) => getField(T, f);
  const u = (f: string, v: string) => updateField(T, f, v);
  return <FormOverlay image={IMAGE} width="100%" fields={FIELDS} g={g} u={u} picker={PICKER} storageKey="picker_table2" />;
}
