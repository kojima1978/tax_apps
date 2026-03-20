import type { ComponentType } from 'react';
import type { CategoryData } from './documents';
import { formatDeadline } from '../utils/helpers';

/** ページ固有の設定 */
export interface PageConfig {
  /** ページタイトル */
  title: string;
  /** サブタイトル */
  subtitle: string;
  /** 印刷時サブタイトル */
  printSubtitle: string;
  /** JSON export/import 用アプリ識別子 */
  appName: string;
  /** ファイル名プレフィックス（JSON/Excel） */
  filenamePrefix: string;
  /** Excel タイトル */
  excelTitle: string;
  /** カテゴリデータ */
  categories: CategoryData[];
  /** ナビリンク（ヘッダー内） */
  navLinks: { to: string; label: string; icon: ComponentType<{ className?: string }> }[];
  /** 入力フィールド設定 */
  inputRows: InputRowConfig[];
  /** 印刷用情報フィールド設定 */
  printInfoFields: PrintInfoFieldConfig[];
  /** 注意事項（HTML文字列の配列） */
  noticeItems: string[];
}

export interface InputRowConfig {
  cols: string;
  fields: {
    key: 'clientName' | 'deceasedName' | 'deadline' | 'personInCharge' | 'personInChargeContact';
    label: string;
    placeholder?: string;
    type?: string;
  }[];
}

export interface PrintInfoFieldConfig {
  key: 'clientName' | 'deceasedName' | 'deadline' | 'personInCharge' | 'personInChargeContact';
  label: string;
  format?: (v: string) => string;
}

/** inputRows のデフォルト生成。clientLabel/clientPlaceholder のみ差し替え可能 */
export function createInputRows(clientLabel = 'お客様名', clientPlaceholder = '例：山田 太郎'): InputRowConfig[] {
  return [
    { cols: 'md:grid-cols-3', fields: [
      { key: 'clientName', label: clientLabel, placeholder: clientPlaceholder },
      { key: 'deceasedName', label: '被相続人名', placeholder: '例：山田 一郎' },
      { key: 'deadline', label: '資料収集期限', type: 'date' },
    ]},
    { cols: 'md:grid-cols-2', fields: [
      { key: 'personInCharge', label: '担当者', placeholder: '例：佐藤 花子' },
      { key: 'personInChargeContact', label: '担当者連絡先', placeholder: '例：088-632-6228' },
    ]},
  ];
}

/** printInfoFields のデフォルト生成。clientLabel/clientFormat のみ差し替え可能 */
export function createPrintInfoFields(
  clientLabel = 'お客様名',
  clientFormat: (v: string) => string = v => `${v} 様`,
): PrintInfoFieldConfig[] {
  return [
    { key: 'clientName', label: clientLabel, format: clientFormat },
    { key: 'deceasedName', label: '被相続人', format: v => `${v} 様` },
    { key: 'deadline', label: '資料収集期限（目安）', format: formatDeadline },
    { key: 'personInCharge', label: '担当者' },
    { key: 'personInChargeContact', label: '担当者連絡先' },
  ];
}
