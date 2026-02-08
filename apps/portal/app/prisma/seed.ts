/**
 * Prisma Database Seed
 * ポータルアプリケーション初期データ
 */

import { PrismaClient } from '../app/generated/prisma/client';
import { createAdapter } from '../lib/prisma';

const prisma = new PrismaClient({ adapter: createAdapter() });

const apps = [
  // 相続税関連
  { title: '相続税計算', description: '相続税の早見表', url: '/inheritance-tax-app/', icon: 'Calculator' },
  { title: '相続税申告 資料準備ガイド', description: '相続税申告に必要な書類をご案内', url: '/inheritance-tax-docs/', icon: 'FileText' },
  { title: '案件管理', description: '相続税案件の進捗管理', url: '/itcm/', icon: 'Briefcase' },
  // 贈与税関連
  { title: '贈与税計算シミュレーター', description: '贈与税計算・早見表・不動産取得税', url: '/gift-tax-simulator/', icon: 'Gift' },
  { title: '贈与税申告 必要書類案内', description: '贈与税申告に必要な書類をご案内', url: '/gift-tax-docs/', icon: 'ClipboardList' },
  // 株式評価
  { title: '医療法人株式評価', description: '医療法人の株式評価システム', url: '/medical/', icon: 'Activity' },
  { title: '非上場株式評価', description: '非上場株式の評価システム', url: '/shares/', icon: 'TrendingUp' },
  // 分析・確定申告
  { title: '銀行分析', description: '預金移動の分析ツール', url: '/bank-analyzer/', icon: 'Building' },
  { title: '確定申告 必要書類', description: '確定申告に必要な書類を確認・管理', url: '/tax-docs/', icon: 'FileCheck' },
];

async function main() {
  // 削除と作成を同一トランザクションで実行（途中失敗時のデータ消失を防止）
  await prisma.$transaction([
    prisma.application.deleteMany(),
    ...apps.map((app) => prisma.application.create({ data: app })),
  ]);

  console.log(`Seeded ${apps.length} applications.`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
