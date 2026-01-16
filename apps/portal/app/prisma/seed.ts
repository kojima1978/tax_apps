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
    {
      title: 'Finance App',
      description: 'Budget management and expense tracking',
      url: '/finance',
      icon: 'PieChart',
    },
    {
      title: 'Task Manager',
      description: 'Organize and track your daily tasks',
      url: '/tasks',
      icon: 'CheckSquare',
    },
    {
      title: 'Analytics Dashboard',
      description: 'View insights and analytics',
      url: '/analytics',
      icon: 'BarChart3',
    },
    {
      title: 'Documentation',
      description: 'Browse project documentation',
      url: '/docs',
      icon: 'BookOpen',
    },
    {
      title: 'Settings',
      description: 'Configure application settings',
      url: '/settings',
      icon: 'Settings',
    },
    {
      title: 'Team Collaboration',
      description: 'Connect and collaborate with your team',
      url: '/team',
      icon: 'Users',
    },
    {
      title: 'Calendar',
      description: 'Schedule and manage events',
      url: '/calendar',
      icon: 'Calendar',
    },
    {
      title: 'Notifications',
      description: 'View all your notifications',
      url: '/notifications',
      icon: 'Bell',
    },
    {
      title: 'File Storage',
      description: 'Upload and manage files',
      url: '/files',
      icon: 'FolderOpen',
    },
  ];

  // データベースに挿入
  for (const app of apps) {
    await prisma.application.create({
      data: app,
    });
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
