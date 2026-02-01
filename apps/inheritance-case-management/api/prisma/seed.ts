import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 担当者データ
  const assignees = await Promise.all([
    prisma.assignee.upsert({
      where: { id: 'a1000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: 'a1000000-0000-0000-0000-000000000001',
        name: '山田 太郎',
        employeeId: 'EMP001',
        department: '資産税部',
        active: true,
      },
    }),
    prisma.assignee.upsert({
      where: { id: 'a1000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: 'a1000000-0000-0000-0000-000000000002',
        name: '佐藤 花子',
        employeeId: 'EMP002',
        department: '資産税部',
        active: true,
      },
    }),
    prisma.assignee.upsert({
      where: { id: 'a1000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: 'a1000000-0000-0000-0000-000000000003',
        name: '鈴木 一郎',
        employeeId: 'EMP003',
        department: '会計部',
        active: true,
      },
    }),
  ]);

  // 紹介者データ
  const referrers = await Promise.all([
    prisma.referrer.upsert({
      where: { id: 'r1000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: 'r1000000-0000-0000-0000-000000000001',
        company: '○○銀行',
        name: '田中 次郎',
        department: '信託部',
        active: true,
      },
    }),
    prisma.referrer.upsert({
      where: { id: 'r1000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: 'r1000000-0000-0000-0000-000000000002',
        company: '△△証券',
        name: '高橋 三郎',
        department: '営業部',
        active: true,
      },
    }),
    prisma.referrer.upsert({
      where: { id: 'r1000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: 'r1000000-0000-0000-0000-000000000003',
        company: '□□不動産',
        name: '伊藤 四郎',
        department: null,
        active: true,
      },
    }),
  ]);

  // 案件データ
  const cases = await Promise.all([
    prisma.inheritanceCase.upsert({
      where: { id: 'c1000000-0000-0000-0000-000000000001' },
      update: {},
      create: {
        id: 'c1000000-0000-0000-0000-000000000001',
        deceasedName: '相続 太郎',
        dateOfDeath: '2025-01-15',
        fiscalYear: 2025,
        status: '進行中',
        acceptanceStatus: '受託可',
        taxAmount: 50000000,
        feeAmount: 2000000,
        estimateAmount: 2500000,
        propertyValue: 300000000,
        referralFeeRate: 10,
        referralFeeAmount: 200000,
        assignee: '山田 太郎',
        referrer: '○○銀行',
        contacts: [
          { name: '相続 一郎', phone: '090-1234-5678', email: 'ichiro@example.com' },
          { name: '相続 二郎', phone: '090-2345-6789', email: 'jiro@example.com' },
        ],
        progress: [
          { id: '1', name: '初回面談', date: '2025-01-20', memo: '資料受領' },
          { id: '2', name: '財産調査', date: '2025-01-25', memo: '' },
          { id: '3', name: '評価完了', date: null, memo: '' },
        ],
      },
    }),
    prisma.inheritanceCase.upsert({
      where: { id: 'c1000000-0000-0000-0000-000000000002' },
      update: {},
      create: {
        id: 'c1000000-0000-0000-0000-000000000002',
        deceasedName: '遺産 花子',
        dateOfDeath: '2025-02-01',
        fiscalYear: 2025,
        status: '未着手',
        acceptanceStatus: '未判定',
        taxAmount: 0,
        feeAmount: 0,
        estimateAmount: 1500000,
        propertyValue: 150000000,
        referralFeeRate: null,
        referralFeeAmount: null,
        assignee: '佐藤 花子',
        referrer: null,
        contacts: [
          { name: '遺産 三郎', phone: '080-1111-2222', email: '' },
        ],
        progress: [],
      },
    }),
    prisma.inheritanceCase.upsert({
      where: { id: 'c1000000-0000-0000-0000-000000000003' },
      update: {},
      create: {
        id: 'c1000000-0000-0000-0000-000000000003',
        deceasedName: '財産 次郎',
        dateOfDeath: '2024-11-10',
        fiscalYear: 2024,
        status: '完了',
        acceptanceStatus: '受託可',
        taxAmount: 80000000,
        feeAmount: 3500000,
        estimateAmount: 3500000,
        propertyValue: 500000000,
        referralFeeRate: 15,
        referralFeeAmount: 525000,
        assignee: '山田 太郎',
        referrer: '△△証券',
        contacts: [
          { name: '財産 四郎', phone: '03-1234-5678', email: 'shiro@example.com' },
        ],
        progress: [
          { id: '1', name: '初回面談', date: '2024-11-15', memo: '' },
          { id: '2', name: '財産調査', date: '2024-11-25', memo: '' },
          { id: '3', name: '評価完了', date: '2024-12-10', memo: '' },
          { id: '4', name: '申告書作成', date: '2024-12-20', memo: '' },
          { id: '5', name: '申告完了', date: '2025-01-10', memo: '' },
        ],
      },
    }),
    prisma.inheritanceCase.upsert({
      where: { id: 'c1000000-0000-0000-0000-000000000004' },
      update: {},
      create: {
        id: 'c1000000-0000-0000-0000-000000000004',
        deceasedName: '相続 三郎',
        dateOfDeath: '2024-12-25',
        fiscalYear: 2024,
        status: '進行中',
        acceptanceStatus: '受託可',
        taxAmount: 20000000,
        feeAmount: 800000,
        estimateAmount: 1000000,
        propertyValue: 120000000,
        referralFeeRate: 10,
        referralFeeAmount: 80000,
        assignee: '鈴木 一郎',
        referrer: '□□不動産',
        contacts: [],
        progress: [
          { id: '1', name: '初回面談', date: '2025-01-05', memo: '' },
        ],
      },
    }),
    prisma.inheritanceCase.upsert({
      where: { id: 'c1000000-0000-0000-0000-000000000005' },
      update: {},
      create: {
        id: 'c1000000-0000-0000-0000-000000000005',
        deceasedName: '遺贈 五郎',
        dateOfDeath: '2024-08-15',
        fiscalYear: 2024,
        status: '請求済',
        acceptanceStatus: '受託可',
        taxAmount: 35000000,
        feeAmount: 1500000,
        estimateAmount: 1500000,
        propertyValue: 200000000,
        referralFeeRate: null,
        referralFeeAmount: null,
        assignee: '佐藤 花子',
        referrer: null,
        contacts: [
          { name: '遺贈 六郎', phone: '090-9999-8888', email: 'rokuro@example.com' },
        ],
        progress: [
          { id: '1', name: '初回面談', date: '2024-08-20', memo: '' },
          { id: '2', name: '財産調査', date: '2024-09-01', memo: '' },
          { id: '3', name: '評価完了', date: '2024-09-15', memo: '' },
          { id: '4', name: '申告書作成', date: '2024-10-01', memo: '' },
          { id: '5', name: '申告完了', date: '2024-10-15', memo: '' },
          { id: '6', name: '請求書発行', date: '2024-10-20', memo: '' },
        ],
      },
    }),
  ]);

  console.log(`Created ${assignees.length} assignees`);
  console.log(`Created ${referrers.length} referrers`);
  console.log(`Created ${cases.length} cases`);
  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
