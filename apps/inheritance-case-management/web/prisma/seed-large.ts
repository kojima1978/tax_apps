import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 現在日付: 2026-03-15
const NOW = new Date('2026-03-15');

const LAST_NAMES = ['佐藤','鈴木','高橋','田中','伊藤','渡辺','山本','中村','小林','加藤','吉田','山田','松本','井上','木村','林','斎藤','清水','山口','石川','前田','藤田','小川','岡田','後藤','長谷川','村上','近藤','坂本','遠藤','青木','藤井','西村','三浦','福田','太田','松田','原','上田','橋本'];
const FIRST_NAMES_M = ['太郎','一郎','健一','正雄','義男','清','茂','勝男','和夫','進','博','隆','誠','豊','修','浩','稔','弘','守','実'];
const FIRST_NAMES_F = ['花子','幸子','美智子','節子','久美','文子','洋子','京子','恵子','和子','裕子','真由美','直美','明美','由美子','智子','悦子','順子','信子','光子'];
const DEPARTMENTS = ['会計部','医療部','建設部','資産税部'] as const;
const COMPANIES = ['○○銀行','△△証券','□□不動産','◎◎信託銀行','★★保険','◆◆税理士法人','●●会計事務所','▲▲ファイナンス','■■信用金庫','☆☆投資顧問','◇◇法律事務所','○△銀行','□◎信託','★◆アドバイザリー','●▲コンサルティング'];
const COMPANY_DEPTS = ['営業部','信託部','法人部','資産運用部','相続対策室','プライベートバンキング部',null];

const STATUSES = ['未着手','進行中','完了（税務申告済）','入金済'] as const;
const ACCEPTANCE_STATUSES = ['受託可','受託不可','未判定','保留'] as const;

const DEFAULT_STEPS = [
  { stepId: 'step-1', name: '初回連絡' },
  { stepId: 'step-2', name: '初回面談' },
  { stepId: 'step-3', name: '2回目訪問' },
  { stepId: 'step-8', name: '最終チェック完了' },
  { stepId: 'step-4', name: '遺産分割（済）' },
  { stepId: 'step-5', name: '申告（済）' },
  { stepId: 'step-6', name: '請求（済）' },
  { stepId: 'step-7', name: '入金確認' },
];

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[rand(0, arr.length - 1)];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

async function main() {
  console.log('Clearing all data...');
  await prisma.inheritanceCase.deleteMany();
  await prisma.assignee.deleteMany();
  await prisma.referrer.deleteMany();

  // Reset sequences
  for (const seq of ['Assignee_id_seq','Referrer_id_seq','InheritanceCase_id_seq','CaseContact_id_seq','CaseProgress_id_seq']) {
    await prisma.$executeRawUnsafe(`ALTER SEQUENCE "${seq}" RESTART WITH 1`);
  }

  // === 担当者30名 ===
  console.log('Creating 30 assignees...');
  const assigneeData = [];
  const usedAssigneeNames = new Set<string>();
  for (let i = 0; i < 30; i++) {
    let name: string;
    do {
      name = `${pick(LAST_NAMES)} ${pick([...FIRST_NAMES_M, ...FIRST_NAMES_F])}`;
    } while (usedAssigneeNames.has(name));
    usedAssigneeNames.add(name);
    assigneeData.push({
      name,
      employeeId: `E${String(i + 1).padStart(3, '0')}`,
      department: DEPARTMENTS[i % DEPARTMENTS.length],
      active: i < 28, // 2名は無効
    });
  }
  await prisma.assignee.createMany({ data: assigneeData });
  const assignees = await prisma.assignee.findMany({ where: { active: true } });
  console.log(`Created ${assigneeData.length} assignees (${assignees.length} active)`);

  // === 紹介者30名 ===
  console.log('Creating 30 referrers...');
  const referrerData = [];
  for (let i = 0; i < 30; i++) {
    const company = COMPANIES[i % COMPANIES.length];
    let contactName: string;
    do {
      contactName = `${pick(LAST_NAMES)} ${pick([...FIRST_NAMES_M, ...FIRST_NAMES_F])}`;
    } while (false);
    referrerData.push({
      company,
      name: contactName,
      department: pick(COMPANY_DEPTS),
      active: i < 28,
    });
  }
  await prisma.referrer.createMany({ data: referrerData });
  const referrers = await prisma.referrer.findMany({ where: { active: true } });
  console.log(`Created ${referrerData.length} referrers (${referrers.length} active)`);

  // === 案件1000件 ===
  console.log('Creating 1000 cases with progress...');
  const fiscalYears = [2021, 2022, 2023, 2024, 2025, 2026];
  const yearWeights = [40, 80, 150, 250, 300, 180]; // 件数配分
  const yearPool: number[] = [];
  for (let i = 0; i < fiscalYears.length; i++) {
    for (let j = 0; j < yearWeights[i]; j++) {
      yearPool.push(fiscalYears[i]);
    }
  }

  let created = 0;
  const BATCH = 50;

  for (let batch = 0; batch < 1000 / BATCH; batch++) {
    const promises = [];
    for (let i = 0; i < BATCH; i++) {
      const fiscalYear = pick(yearPool);

      // 死亡日: 年度内のランダム日
      const yearStart = new Date(`${fiscalYear}-01-01`);
      const yearEnd = new Date(`${fiscalYear}-12-31`);
      // 死亡日は年度の範囲内、ただしNOWより前
      const maxDeathDate = yearEnd > NOW ? new Date(NOW.getTime() - 24 * 60 * 60 * 1000) : yearEnd;
      const dateOfDeath = randomDate(yearStart, maxDeathDate);
      const deathStr = formatDate(dateOfDeath);

      // 申告期限
      const deadline = new Date(dateOfDeath);
      deadline.setMonth(deadline.getMonth() + 10);

      // ステータス・受託状況の決定
      let status: string;
      let acceptanceStatus: string;
      const monthsSinceDeath = (NOW.getTime() - dateOfDeath.getTime()) / (1000 * 60 * 60 * 24 * 30);

      if (monthsSinceDeath > 14) {
        // 古い案件: ほぼ完了or入金済
        const r = Math.random();
        if (r < 0.05) { acceptanceStatus = '受託不可'; status = '対応終了'; }
        else if (r < 0.55) { acceptanceStatus = '受託可'; status = '入金済'; }
        else if (r < 0.90) { acceptanceStatus = '受託可'; status = '完了（税務申告済）'; }
        else { acceptanceStatus = '受託可'; status = '進行中'; } // 遅延案件
      } else if (monthsSinceDeath > 8) {
        // 期限前後: 混在
        const r = Math.random();
        if (r < 0.05) { acceptanceStatus = '受託不可'; status = '対応終了'; }
        else if (r < 0.25) { acceptanceStatus = '受託可'; status = '入金済'; }
        else if (r < 0.50) { acceptanceStatus = '受託可'; status = '完了（税務申告済）'; }
        else if (r < 0.85) { acceptanceStatus = '受託可'; status = '進行中'; }
        else { acceptanceStatus = '未判定'; status = '未着手'; }
      } else if (monthsSinceDeath > 3) {
        // 中盤
        const r = Math.random();
        if (r < 0.05) { acceptanceStatus = '受託不可'; status = '対応終了'; }
        else if (r < 0.10) { acceptanceStatus = '保留'; status = '未着手'; }
        else if (r < 0.15) { acceptanceStatus = '未判定'; status = '未着手'; }
        else if (r < 0.60) { acceptanceStatus = '受託可'; status = '進行中'; }
        else if (r < 0.80) { acceptanceStatus = '受託可'; status = '完了（税務申告済）'; }
        else { acceptanceStatus = '受託可'; status = '入金済'; }
      } else {
        // 新しい案件
        const r = Math.random();
        if (r < 0.30) { acceptanceStatus = '未判定'; status = '未着手'; }
        else if (r < 0.40) { acceptanceStatus = '保留'; status = '未着手'; }
        else if (r < 0.50) { acceptanceStatus = '受託不可'; status = '対応終了'; }
        else if (r < 0.80) { acceptanceStatus = '受託可'; status = '未着手'; }
        else { acceptanceStatus = '受託可'; status = '進行中'; }
      }

      // 金額
      const propertyValue = rand(3, 100) * 10000000; // 3000万〜10億
      const taxRate = Math.random() * 0.3 + 0.05;
      const taxAmount = (status === '未着手' && acceptanceStatus !== '受託可') ? 0 : Math.round(propertyValue * taxRate);
      const feeBase = Math.round(propertyValue * (Math.random() * 0.01 + 0.005));
      const estimateAmount = acceptanceStatus === '受託不可' ? 0 : feeBase;
      const feeAmount = (status === '完了（税務申告済）' || status === '入金済') ? feeBase : 0;

      // 紹介者
      const hasReferrer = Math.random() < 0.6;
      const referrerId = hasReferrer ? pick(referrers).id : null;
      const referralFeeRate = hasReferrer ? pick([10, 15, 20]) : null;
      const referralFeeAmount = (hasReferrer && feeBase > 0) ? Math.round(feeBase * (referralFeeRate! / 100)) : null;

      // 担当者
      const hasAssignee = acceptanceStatus !== '未判定' || Math.random() < 0.3;
      const assigneeId = hasAssignee ? pick(assignees).id : null;

      // 被相続人名
      const lastName = pick(LAST_NAMES);
      const firstName = Math.random() < 0.5 ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
      const deceasedName = `${lastName} ${firstName}`;

      // 進捗ステップ生成
      const progressSteps: { stepId: string; name: string; sortOrder: number; date: string | null; memo: string }[] = [];
      let completedStepCount = 0;
      if (status === '入金済') completedStepCount = 8;
      else if (status === '完了（税務申告済）') completedStepCount = rand(5, 7);
      else if (status === '進行中') completedStepCount = rand(1, 4);
      else completedStepCount = Math.random() < 0.3 ? 1 : 0;

      let stepDate = addDays(dateOfDeath, rand(3, 14));
      for (let s = 0; s < DEFAULT_STEPS.length; s++) {
        const step = DEFAULT_STEPS[s];
        let date: string | null = null;
        let memo = '';
        if (s < completedStepCount) {
          if (stepDate <= NOW) {
            date = formatDate(stepDate);
          }
          stepDate = addDays(stepDate, rand(7, 45));
        }
        if (s === 0 && date) memo = '資料受領';
        progressSteps.push({ stepId: step.stepId, name: step.name, sortOrder: s, date, memo });
      }

      promises.push(
        prisma.inheritanceCase.create({
          data: {
            deceasedName,
            dateOfDeath: deathStr,
            fiscalYear,
            status,
            acceptanceStatus,
            taxAmount,
            feeAmount,
            estimateAmount,
            propertyValue,
            referralFeeRate,
            referralFeeAmount,
            assigneeId,
            referrerId,
            progress: { create: progressSteps },
          },
        })
      );
    }
    await Promise.all(promises);
    created += BATCH;
    if (created % 200 === 0) console.log(`  ${created}/1000 created`);
  }

  const totalCount = await prisma.inheritanceCase.count();
  console.log(`\nSeeding completed! Total cases: ${totalCount}`);

  // 年度別集計
  const yearCounts = await prisma.inheritanceCase.groupBy({ by: ['fiscalYear'], _count: true, orderBy: { fiscalYear: 'asc' } });
  console.log('Year distribution:');
  yearCounts.forEach(y => console.log(`  ${y.fiscalYear}: ${y._count} cases`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
