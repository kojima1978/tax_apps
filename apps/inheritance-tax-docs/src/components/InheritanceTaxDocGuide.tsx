import { Building2, ClipboardList } from 'lucide-react';
import { CATEGORIES } from '../constants/documents';
import { type PageConfig, createInputRows, createPrintInfoFields } from '../constants/pageConfig';
import { DocumentGuidePage } from './DocumentGuidePage';

const PAGE_CONFIG: PageConfig = {
  title: '相続税申告 資料準備ガイド',
  subtitle: 'テーブル上で直接 編集・削除・並べ替え・代行切替ができます',
  printSubtitle: '以下の書類をご準備の上、ご来所・ご郵送ください。',
  appName: 'inheritance-tax-docs',
  filenamePrefix: 'inheritance-tax-docs',
  excelTitle: '相続税申告 資料準備ガイド',
  categories: CATEGORIES,
  navLinks: [
    { to: '/simplified', label: '簡易版', icon: ClipboardList },
    { to: '/unlisted-stock', label: '非上場株式', icon: Building2 },
  ],
  inputRows: createInputRows(),
  printInfoFields: createPrintInfoFields(),
  noticeItems: [
    '資料は原本、コピー、データなどどのような形でお送りいただいても結構です。原本はスキャンやコピーを行った後、すべてお返しいたします。',
    '代行欄に<span class="bg-amber-200 px-1 rounded print:px-0.5">可</span>と記載されている書類は弊社で取得代行を行うことが可能です。詳しくは担当者にお尋ねください。',
    '身分関係書類は原則として相続開始日から10日を経過した日以後に取得したものが必要となります。',
  ],
};

export default function InheritanceTaxDocGuide() {
  return <DocumentGuidePage pageConfig={PAGE_CONFIG} />;
}
