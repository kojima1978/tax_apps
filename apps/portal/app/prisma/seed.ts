/**
 * Prisma Database Seed
 * ポータルアプリケーション初期データ
 */

import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const adapter = new PrismaLibSql({
  url: 'file:./dev.db',
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // 既存のデータを削除
  await prisma.application.deleteMany();

  // 初期アプリケーションデータ
  const apps = [
    // 相続税関連
    {
      title: '相続税計算',
      description: '相続税のシミュレーション計算',
      url: '/inheritance-tax-app/',
      icon: 'Calculator',
    },
    {
      title: '相続税申告 資料準備ガイド',
      description: '相続税申告に必要な書類をご案内',
      url: '/inheritance-tax-docs/',
      icon: 'FileText',
    },
    {
      title: '案件管理',
      description: '相続税案件の進捗管理',
      url: '/itcm/',
      icon: 'Briefcase',
    },

    // 贈与税関連
    {
      title: '贈与税計算シミュレーター',
      description: '贈与税・間接税のシミュレーション',
      url: '/gift-tax-simulator/',
      icon: 'Gift',
    },
    {
      title: '贈与税申告 必要書類案内',
      description: '贈与税申告に必要な書類をご案内',
      url: '/gift-tax-docs/',
      icon: 'ClipboardList',
    },
    {
      title: '間接税シミュレーター',
      description: '土地・建物取得時の税金計算',
      url: '/gift-tax-simulator/real-estate',
      icon: 'Home',
    },

    // 株式評価
    {
      title: '医療法人株式評価',
      description: '医療法人の株式評価システム',
      url: '/medical/',
      icon: 'Activity',
    },
    {
      title: '非上場株式評価',
      description: '非上場株式の評価システム',
      url: '/shares/',
      icon: 'TrendingUp',
    },

    // 分析・確定申告
    {
      title: '銀行分析',
      description: '預金移動の分析ツール',
      url: '/bank-analyzer/',
      icon: 'Building',
    },
    {
      title: '確定申告 必要書類',
      description: '確定申告に必要な書類を確認・管理',
      url: '/tax-docs/',
      icon: 'FileCheck',
    },
  ];

  // データベースに挿入
  for (const app of apps) {
    await prisma.application.create({
      data: app,
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log(`   ${apps.length} applications created.`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
