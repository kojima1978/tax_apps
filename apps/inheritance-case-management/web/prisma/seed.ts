import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 既存データをクリア（子テーブルはCASCADEで自動削除）
  await prisma.inheritanceCase.deleteMany();
  await prisma.referrer.deleteMany();
  await prisma.company.deleteMany();
  await prisma.assignee.deleteMany();
  await prisma.department.deleteMany();

  // シーケンスをリセット
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Department_id_seq" RESTART WITH 1`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Assignee_id_seq" RESTART WITH 1`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Company_id_seq" RESTART WITH 1`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "Referrer_id_seq" RESTART WITH 1`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "InheritanceCase_id_seq" RESTART WITH 1`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "CaseContact_id_seq" RESTART WITH 1`);
  await prisma.$executeRawUnsafe(`ALTER SEQUENCE "CaseProgress_id_seq" RESTART WITH 1`);

  // 部署データ
  const departments = await Promise.all([
    prisma.department.create({ data: { name: '資産税部', sortOrder: 0 } }),
    prisma.department.create({ data: { name: '会計部', sortOrder: 1 } }),
  ]);

  // 担当者データ (id: 1, 2, 3)
  const assignees = await Promise.all([
    prisma.assignee.create({
      data: {
        name: '山田 太郎',
        employeeId: 'EMP001',
        departmentId: departments[0].id,
        active: true,
      },
    }),
    prisma.assignee.create({
      data: {
        name: '佐藤 花子',
        employeeId: 'EMP002',
        departmentId: departments[0].id,
        active: true,
      },
    }),
    prisma.assignee.create({
      data: {
        name: '鈴木 一郎',
        employeeId: 'EMP003',
        departmentId: departments[1].id,
        active: true,
      },
    }),
  ]);

  // 会社データ (id: 1, 2, 3)
  const companies = await Promise.all([
    prisma.company.create({ data: { name: '○○銀行' } }),
    prisma.company.create({ data: { name: '△△証券' } }),
    prisma.company.create({ data: { name: '□□不動産' } }),
  ]);

  // 部門データ (id: 1, 2)
  const branches = await Promise.all([
    prisma.companyBranch.create({
      data: { companyId: companies[0].id, name: '信託部' },
    }),
    prisma.companyBranch.create({
      data: { companyId: companies[1].id, name: '営業部' },
    }),
  ]);

  // 紹介者データ (id: 1, 2, 3)
  const referrers = await Promise.all([
    prisma.referrer.create({
      data: {
        companyId: companies[0].id,
        branchId: branches[0].id,
        active: true,
      },
    }),
    prisma.referrer.create({
      data: {
        companyId: companies[1].id,
        branchId: branches[1].id,
        active: true,
      },
    }),
    prisma.referrer.create({
      data: {
        companyId: companies[2].id,
        branchId: null,
        active: true,
      },
    }),
  ]);

  // 案件データ（ネストcreateで子レコードも同時作成）
  const cases = await Promise.all([
    prisma.inheritanceCase.create({
      data: {
        deceasedName: '相続 太郎',
        dateOfDeath: '2025-01-15',
        fiscalYear: 2025,
        status: '進行中',
        acceptanceStatus: '受託可',
        taxAmount: 50000000,
        feeAmount: 2000000,
        estimateAmount: 2500000,
        propertyValue: 300000000,
        landRosenkaCount: 3,
        landBairitsuCount: 1,
        unlistedStockCount: 0,
        heirCount: 3,
        referralFeeRate: 10,
        referralFeeAmount: 200000,
        assigneeId: assignees[0].id,
        referrerId: referrers[0].id,
        contacts: {
          create: [
            { name: '相続 一郎', phone: '090-1234-5678', postalCode: '100-0001', address: '東京都千代田区千代田1-1', memo: '', sortOrder: 0 },
            { name: '相続 二郎', phone: '090-2345-6789', postalCode: '160-0023', address: '東京都新宿区西新宿2-8-1', memo: '', sortOrder: 1 },
          ],
        },
        progress: {
          create: [
            { stepId: '1', name: '初回面談', date: '2025-01-20', memo: '資料受領', sortOrder: 0 },
            { stepId: '2', name: '財産調査', date: '2025-01-25', memo: '', sortOrder: 1 },
            { stepId: '3', name: '評価完了', date: null, memo: '', sortOrder: 2 },
          ],
        },
      },
    }),
    prisma.inheritanceCase.create({
      data: {
        deceasedName: '遺産 花子',
        dateOfDeath: '2025-02-01',
        fiscalYear: 2025,
        status: '未着手',
        acceptanceStatus: '未判定',
        taxAmount: 0,
        feeAmount: 0,
        estimateAmount: 1500000,
        propertyValue: 150000000,
        landRosenkaCount: 1,
        landBairitsuCount: 0,
        unlistedStockCount: 0,
        heirCount: 2,
        referralFeeRate: null,
        referralFeeAmount: null,
        assigneeId: assignees[1].id,
        referrerId: null,
        contacts: {
          create: [
            { name: '遺産 三郎', phone: '080-1111-2222', postalCode: '', address: '', memo: '', sortOrder: 0 },
          ],
        },
      },
    }),
    prisma.inheritanceCase.create({
      data: {
        deceasedName: '財産 次郎',
        dateOfDeath: '2024-11-10',
        fiscalYear: 2024,
        status: '完了（税務申告済）',
        acceptanceStatus: '受託可',
        taxAmount: 80000000,
        feeAmount: 3500000,
        estimateAmount: 3500000,
        propertyValue: 500000000,
        landRosenkaCount: 5,
        landBairitsuCount: 2,
        unlistedStockCount: 1,
        heirCount: 4,
        referralFeeRate: 15,
        referralFeeAmount: 525000,
        assigneeId: assignees[0].id,
        referrerId: referrers[1].id,
        contacts: {
          create: [
            { name: '財産 四郎', phone: '03-1234-5678', postalCode: '530-0001', address: '大阪府大阪市北区梅田1-1', memo: '', sortOrder: 0 },
          ],
        },
        progress: {
          create: [
            { stepId: '1', name: '初回面談', date: '2024-11-15', memo: '', sortOrder: 0 },
            { stepId: '2', name: '財産調査', date: '2024-11-25', memo: '', sortOrder: 1 },
            { stepId: '3', name: '評価完了', date: '2024-12-10', memo: '', sortOrder: 2 },
            { stepId: '4', name: '申告書作成', date: '2024-12-20', memo: '', sortOrder: 3 },
            { stepId: '5', name: '申告完了', date: '2025-01-10', memo: '', sortOrder: 4 },
          ],
        },
      },
    }),
    prisma.inheritanceCase.create({
      data: {
        deceasedName: '相続 三郎',
        dateOfDeath: '2024-12-25',
        fiscalYear: 2024,
        status: '進行中',
        acceptanceStatus: '受託可',
        taxAmount: 20000000,
        feeAmount: 800000,
        estimateAmount: 1000000,
        propertyValue: 120000000,
        landRosenkaCount: 2,
        landBairitsuCount: 0,
        unlistedStockCount: 0,
        heirCount: 2,
        referralFeeRate: 10,
        referralFeeAmount: 80000,
        assigneeId: assignees[2].id,
        referrerId: referrers[2].id,
        progress: {
          create: [
            { stepId: '1', name: '初回面談', date: '2025-01-05', memo: '', sortOrder: 0 },
          ],
        },
      },
    }),
    prisma.inheritanceCase.create({
      data: {
        deceasedName: '遺贈 五郎',
        dateOfDeath: '2024-08-15',
        fiscalYear: 2024,
        status: '入金済',
        acceptanceStatus: '受託可',
        taxAmount: 35000000,
        feeAmount: 1500000,
        estimateAmount: 1500000,
        propertyValue: 200000000,
        landRosenkaCount: 1,
        landBairitsuCount: 1,
        unlistedStockCount: 0,
        heirCount: 3,
        referralFeeRate: null,
        referralFeeAmount: null,
        assigneeId: assignees[1].id,
        referrerId: null,
        contacts: {
          create: [
            { name: '遺贈 六郎', phone: '090-9999-8888', postalCode: '460-0008', address: '愛知県名古屋市中区栄3-1', memo: '', sortOrder: 0 },
          ],
        },
        progress: {
          create: [
            { stepId: '1', name: '初回面談', date: '2024-08-20', memo: '', sortOrder: 0 },
            { stepId: '2', name: '財産調査', date: '2024-09-01', memo: '', sortOrder: 1 },
            { stepId: '3', name: '評価完了', date: '2024-09-15', memo: '', sortOrder: 2 },
            { stepId: '4', name: '申告書作成', date: '2024-10-01', memo: '', sortOrder: 3 },
            { stepId: '5', name: '申告完了', date: '2024-10-15', memo: '', sortOrder: 4 },
            { stepId: '6', name: '請求書発行', date: '2024-10-20', memo: '', sortOrder: 5 },
          ],
        },
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
