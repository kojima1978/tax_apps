'use client';

import { SimpleMasterSettingsPage, type SimpleMasterConfig } from '@/components/SimpleMasterSettingsPage';

type User = {
  id: string;
  name: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};

const config: SimpleMasterConfig<User> = {
  apiEndpoint: '/medical/api/users',
  pageTitle: '担当者マスタ設定',
  description: '担当者情報を管理します。',
  entityLabel: '担当者',
  formLabel: '担当者名',
  formPlaceholder: '例：山田太郎',
  searchLabel: '担当者名で絞り込み',
  searchPlaceholder: '担当者名を入力...',
  getName: (r) => r.name,
  nameField: 'name',
  step0Field: 'personInCharge',
};

export default function UserSettingsPage() {
  return <SimpleMasterSettingsPage<User> config={config} />;
}
