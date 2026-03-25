import { ArrowLeft } from 'lucide-react';
import { SIMPLIFIED_CATEGORIES } from '../constants/simplifiedDocuments';
import { type PageConfig, createInputRows, createPrintInfoFields } from '../constants/pageConfig';
import { DocumentGuidePage } from './DocumentGuidePage';

const PAGE_CONFIG: PageConfig = {
  title: '相続税シミュレーション 資料準備ガイド（簡易版）',
  subtitle: 'シミュレーション作成に必要な書類のみ表示しています',
  printSubtitle: '以下の書類をご準備ください。',
  appName: 'inheritance-tax-docs-simplified',
  filenamePrefix: 'inheritance-tax-docs-simplified',
  excelTitle: '相続税シミュレーション 資料準備ガイド（簡易版）',
  categories: SIMPLIFIED_CATEGORIES,
  navLinks: [
    { to: '/', label: '資料準備ガイド', icon: ArrowLeft },
  ],
  inputRows: createInputRows(),
  printInfoFields: createPrintInfoFields(),
  noticeItems: [
    <>こちらは<strong>相続税シミュレーション</strong>に必要な書類のみをまとめた簡易版です。</>,
    '資料は原本、コピー、データなどどのような形でお送りいただいても結構です。',
  ],
};

export function SimplifiedGuidePage() {
  return <DocumentGuidePage pageConfig={PAGE_CONFIG} />;
}
