/**
 * 見積書・請求書のExcel出力
 *
 * テンプレートファイル（/app/templates/estimate_template.xlsx）を読み込んでデータ埋め込み。
 * テンプレートが存在しない場合はエラー。
 */
import type { InheritanceCase } from '@/types/shared';
import { formatReferrerLabel } from '@/types/shared';
import { apiClient } from './api/client';

type DocumentType = 'estimate' | 'invoice' | 'invoice-request';

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
    const res = await apiClient<{ exists: boolean }>(`/templates?type=${docType}`);
    return res.exists;
  } catch {
    return false;
  }
}

/** サーバーサイドでテンプレートに値を埋め込み、Blobとして取得 */
async function generateFromTemplate(
  docType: DocumentType,
  data: {
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
    documentAmount?: number;
    assigneeName?: string;
    referrerName?: string;
    revenueAmount?: number;
    referralFeeAmount?: number;
  },
): Promise<Blob> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/itcm/api';
  const res = await fetch(`${apiUrl}/templates/generate`, {
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

const DOC_TYPE_FILE_LABELS: Record<DocumentType, string> = {
  estimate: '見積書',
  invoice: '請求書',
  'invoice-request': '請求書発行依頼票',
};

export async function exportDocument(params: ExportParams): Promise<void> {
  const { caseData, docType, addresseeNames } = params;

  const typeLabel = DOC_TYPE_FILE_LABELS[docType];
  const dateStr = params.issueDate.replace(/-/g, '');
  const fileName = `${typeLabel}_${caseData.deceasedName}_${dateStr}.xlsx`;

  const hasTemplate = await checkTemplateExists(docType);
  if (!hasTemplate) {
    throw new Error('テンプレートファイルが見つかりません。サーバーにテンプレートを配置してください。');
  }

  const expensesTotal = (caseData.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
  const documentAmount =
    docType === 'estimate'
      ? caseData.estimateAmount || 0
      : docType === 'invoice'
        ? caseData.feeAmount || 0
        : undefined;
  const revenueAmount = caseData.feeAmount || 0;
  const referralFeeAmount = caseData.referralFeeAmount || 0;
  const blob = await generateFromTemplate(docType, {
    addresseeName: addresseeNames[0] || '',
    deceasedName: caseData.deceasedName,
    propertyValue: caseData.propertyValue || 0,
    landRosenkaCount: caseData.landRosenkaCount || 0,
    landBairitsuCount: caseData.landBairitsuCount || 0,
    unlistedStockCount: caseData.unlistedStockCount || 0,
    heirCount: caseData.heirCount || 0,
    discount: caseData.discountAmount || 0,
    expensesTotal,
    documentAmount,
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
