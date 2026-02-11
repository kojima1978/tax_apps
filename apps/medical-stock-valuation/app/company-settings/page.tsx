'use client';

import { SimpleMasterSettingsPage, type SimpleMasterConfig } from '@/components/SimpleMasterSettingsPage';

type Company = {
  id: string;
  company_name: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

const config: SimpleMasterConfig<Company> = {
  apiEndpoint: '/medical/api/companies',
  pageTitle: '会社マスタ設定',
  description: '会社情報を管理します。',
  entityLabel: '会社',
  formLabel: '会社名',
  formPlaceholder: '例：○○医療法人',
  searchLabel: '会社名で絞り込み',
  searchPlaceholder: '会社名を入力...',
  getName: (r) => r.company_name,
  nameField: 'company_name',
  step0Field: 'companyName',
};

export default function CompanySettingsPage() {
  return <SimpleMasterSettingsPage<Company> config={config} />;
}
