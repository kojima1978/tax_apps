import { CategoryGroup } from '@/types';
import { API_BASE_URL } from './api';
import { toReiwa } from './date';

// ==================== 型定義 ====================

export interface FullBackupExport {
  version: string;
  exportedAt: string;
  appName: 'required-documents-for-tax-return';
  type: 'full-backup';
  data: {
    staff: Array<{ staff_name: string; mobile_number: string | null }>;
    customers: Array<{
      customer_name: string;
      staff_name: string;
      records: Array<{ year: number; document_groups: CategoryGroup[] }>;
    }>;
  };
}

export interface CustomerExport {
  version: string;
  exportedAt: string;
  appName: 'required-documents-for-tax-return';
  type: 'customer-data';
  data: {
    customer_name: string;
    staff_name: string;
    year: number;
    document_groups: CategoryGroup[];
  };
}

interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// ==================== 顧客単位エクスポート ====================

export function exportCustomerJson(
  customerName: string,
  staffName: string,
  year: number,
  documentGroups: CategoryGroup[]
): void {
  const payload: CustomerExport = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    appName: 'required-documents-for-tax-return',
    type: 'customer-data',
    data: {
      customer_name: customerName,
      staff_name: staffName,
      year,
      document_groups: documentGroups,
    },
  };
  const reiwaYear = toReiwa(year);
  downloadJson(payload, `${customerName}_令和${reiwaYear}年_書類データ.json`);
}

// ==================== インポートバリデーション共通 ====================

function validateImport(
  data: unknown,
  expectedType: string,
  typeError: string,
  checkData: (d: Record<string, unknown>) => boolean,
  dataError: string,
): ValidationResult {
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: '無効なJSONデータです。' };
  }
  const obj = data as Record<string, unknown>;
  if (obj.appName !== 'required-documents-for-tax-return') {
    return { isValid: false, error: 'このファイルは確定申告 必要書類アプリのデータではありません。' };
  }
  if (obj.type !== expectedType) {
    return { isValid: false, error: typeError };
  }
  const d = obj.data as Record<string, unknown> | undefined;
  if (!d || !checkData(d)) {
    return { isValid: false, error: dataError };
  }
  return { isValid: true };
}

export function validateCustomerImport(data: unknown): ValidationResult {
  return validateImport(
    data,
    'customer-data',
    'お客様データ形式ではありません。一括バックアップファイルの可能性があります。',
    (d) => typeof d.customer_name === 'string' && typeof d.staff_name === 'string' && typeof d.year === 'number' && Array.isArray(d.document_groups),
    'データ構造が不正です。',
  );
}

// ==================== 全データバックアップエクスポート ====================

export async function exportFullBackup(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/backup/export`);
  if (!response.ok) throw new Error('バックアップの取得に失敗しました');
  const data = await response.json();
  const date = new Date().toISOString().split('T')[0];
  downloadJson(data, `確定申告_全データバックアップ_${date}.json`);
}

// ==================== 全データバックアップインポート ====================

export function validateFullBackupImport(data: unknown): ValidationResult {
  return validateImport(
    data,
    'full-backup',
    '一括バックアップ形式ではありません。',
    (d) => Array.isArray(d.staff) && Array.isArray(d.customers),
    'バックアップデータの構造が不正です。',
  );
}

export async function importFullBackup(
  data: FullBackupExport
): Promise<{ success: boolean; message: string; staffCount: number; customerCount: number; recordCount: number }> {
  const response = await fetch(`${API_BASE_URL}/api/backup/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || '復元に失敗しました');
  }
  return response.json();
}

// ==================== 共通ヘルパー ====================

export function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        resolve(JSON.parse(content));
      } catch {
        reject(new Error('JSONファイルの解析に失敗しました。'));
      }
    };
    reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました。'));
    reader.readAsText(file);
  });
}

function downloadJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
