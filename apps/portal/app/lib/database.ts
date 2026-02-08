import { prisma } from './prisma';

export function fetchAllApplications() {
  return prisma.application.findMany({ orderBy: { createdAt: 'asc' } });
}
