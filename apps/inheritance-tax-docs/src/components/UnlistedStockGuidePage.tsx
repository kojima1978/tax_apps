import { ArrowLeft } from 'lucide-react';
import { UNLISTED_STOCK_CATEGORIES } from '../constants/unlistedStockDocuments';
import { type PageConfig, createInputRows, createPrintInfoFields } from '../constants/pageConfig';
import { DocumentGuidePage } from './DocumentGuidePage';

const PAGE_CONFIG: PageConfig = {
  title: '取引相場のない株式 必要書類のご案内',
  subtitle: 'テーブル上で直接 編集・削除・並べ替え・代行切替ができます',
  printSubtitle: '非上場株式の評価に必要な書類を以下にまとめています。ご準備をお願いいたします。',
  appName: 'unlisted-stock-docs',
  filenamePrefix: 'unlisted-stock-docs',
  excelTitle: '取引相場のない株式 必要書類のご案内',
  categories: UNLISTED_STOCK_CATEGORIES,
  navLinks: [
    { to: '/', label: '資料準備ガイド', icon: ArrowLeft },
  ],
  inputRows: createInputRows('対象法人名', '例：株式会社○○'),
  printInfoFields: createPrintInfoFields('対象法人'),
  noticeItems: [
    '以下の書類は、<strong>取引相場のない株式（非上場株式）の評価</strong>に必要なものです。',
    '原則として<strong>直前期末以前3期分</strong>の書類が必要です。',
    '該当しない項目はご準備不要です。ご不明な場合はお気軽にお問い合わせください。',
    '書類は<strong>コピーで結構</strong>です。原本は会社でお手元に保管してください。',
  ],
};

export function UnlistedStockGuidePage() {
  return <DocumentGuidePage pageConfig={PAGE_CONFIG} />;
}
