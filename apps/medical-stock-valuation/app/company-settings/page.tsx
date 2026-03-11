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
  pageTitle: '医療法人マスタ設定',
  description: '医療法人情報を管理します。',
  entityLabel: '医療法人',
  formLabel: '医療法人名',
  formPlaceholder: '例：○○医療法人',
  searchLabel: '医療法人名で絞り込み',
  searchPlaceholder: '医療法人名を入力...',
  getName: (r) => r.company_name,
  nameField: 'company_name',
  step0Field: 'companyName',
};

export default function CompanySettingsPage() {
  return <SimpleMasterSettingsPage<Company> config={config} />;
}
