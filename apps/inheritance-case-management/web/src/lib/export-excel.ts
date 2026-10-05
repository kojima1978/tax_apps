/**
 * 見積書・請求書のExcel出力
 *
 * テンプレートファイル（/app/templates/estimate_template.xlsx）を読み込んでデータ埋め込み。
 * テンプレートが存在しない場合はエラー。
 */
import type { InheritanceCase } from '@/types/shared';
import { formatReferrerLabel } from '@/types/shared';
import { API_URL, apiClient } from './api/client';
import { DOCUMENT_TYPE_LABELS, type DocumentType } from '@/lib/document-types';
import { exportFileName } from '@/lib/export-filename';

interface ExportParams {
  caseData: InheritanceCase;
  docType: DocumentType;
  /** 宛先に使う連絡先名のリスト */
  addresseeNames: string[];
  /** 発行日 (YYYY-MM-DD) */
  issueDate: string;
}

/** テンプレートが存在するか確認 */
async function checkTemplateExists(docType: DocumentType): Promise<boolean> {
  try {
    const res = await apiClient<{ exists: boolean }>(`/templates/?type=${docType}`);
    return res.exists;
  } catch {
    return false;
  }
}

/** サーバーサイドでテンプレートに値を埋め込み、Blobとして取得 */
async function generateFromTemplate(
  docType: DocumentType,
  data: {
    issueDate: string;
    addresseeName: string;
    deceasedName: string;
    propertyValue: number;
    landRosenkaCount: number;
    landBairitsuCount: number;
    unlistedStockCount: number;
    heirCount: number;
    discount: number;
    expensesTotal: number;
    specialAdditions?: { description: string; amount: number }[];
    assigneeName?: string;
    referrerName?: string;
    revenueAmount?: number;
    referralFeeAmount?: number;
  },
): Promise<Blob> {
  const res = await fetch(`${API_URL}/templates/generate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docType, ...data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || '生成に失敗しました');
  }
  return res.blob();
}

const MAX_ESTIMATE_INVOICE_ADDRESSEES = 3;
const HONORIFIC_SUFFIX_PATTERN = /(?:様|御中|各位)$/;

function formatAddresseeWithHonorific(name: string): string {
  return HONORIFIC_SUFFIX_PATTERN.test(name) ? name : `${name} 様`;
}

function formatEstimateInvoiceAddressee(addresseeNames: string[]): string {
  const names = addresseeNames
    .map(name => name.trim())
    .filter(Boolean);
  if (names.length > MAX_ESTIMATE_INVOICE_ADDRESSEES) {
    throw new Error(`宛先は最大${MAX_ESTIMATE_INVOICE_ADDRESSEES}人まで選択できます`);
  }
  return names
    .map(name => name === '相続人各位' ? name : formatAddresseeWithHonorific(name))
    .join('\n');
}

export async function exportDocument(params: ExportParams): Promise<void> {
  const { caseData, docType, addresseeNames } = params;

  // 日付印は作った日ではなく発行日。控えを並べたときに帳票の日付と合う。
  const fileName = exportFileName(
    [caseData.deceasedName, DOCUMENT_TYPE_LABELS[docType]],
    'xlsx',
    new Date(`${params.issueDate}T00:00:00+09:00`),
  );

  const hasTemplate = await checkTemplateExists(docType);
  if (!hasTemplate) {
    throw new Error('テンプレートファイルが見つかりません。サーバーにテンプレートを配置してください。');
  }

  const expensesTotal = (caseData.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
  const revenueAmount = caseData.feeAmount || 0;
  const referralFeeAmount = caseData.referralFeeAmount || 0;
  const addresseeName = docType === 'invoice-request'
    ? (addresseeNames[0] || '')
    : formatEstimateInvoiceAddressee(addresseeNames);
  const blob = await generateFromTemplate(docType, {
    issueDate: params.issueDate,
    addresseeName,
    deceasedName: caseData.deceasedName,
    propertyValue: caseData.propertyValue || 0,
    landRosenkaCount: caseData.landRosenkaCount || 0,
    landBairitsuCount: caseData.landBairitsuCount || 0,
    unlistedStockCount: caseData.unlistedStockCount || 0,
    heirCount: caseData.feeCalculationHeirCount || 0,
    discount: caseData.discountAmount || 0,
    expensesTotal,
    specialAdditions: (caseData.specialAdditions || []).slice(0, 2).map(a => ({
      description: a.description,
      amount: a.amount || 0,
    })),
    assigneeName: caseData.assignee?.name,
    referrerName: caseData.referrer
      ? formatReferrerLabel(caseData.referrer)
      : caseData.internalReferrer
        ? `（社内）${caseData.internalReferrer.department?.name ? caseData.internalReferrer.department.name + ' / ' : ''}${caseData.internalReferrer.name}`
        : undefined,
    revenueAmount,
    referralFeeAmount,
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
