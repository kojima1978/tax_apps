import { createAssignee } from '@/lib/api/assignees';
import { createReferrer } from '@/lib/api/referrers';
import { createDepartment } from '@/lib/api/departments';
import { createCompany } from '@/lib/api/companies';
import { createCompanyBranch } from '@/lib/api/company-branches';
import type { PendingReferrer, PendingAssignee } from './types';
import type { Department, Company, CompanyBranch } from '@/types/shared';

async function resolveOrCreateByName<T extends { id: number; name: string }>(
  name: string,
  items: T[],
  cache: Map<string, number>,
  createFn: (payload: { name: string }) => Promise<T>
): Promise<number> {
  const cached = cache.get(name);
  if (cached) return cached;

  const existing = items.find((item) => item.name === name);
  if (existing) {
    cache.set(name, existing.id);
    return existing.id;
  }

  const created = await createFn({ name });
  cache.set(name, created.id);
  return created.id;
}

export async function resolveOrCreateAssignee(
  pending: PendingAssignee,
  departments: Department[],
  assigneeCache: Map<string, number>,
  departmentCache: Map<string, number>
): Promise<number> {
  const cached = assigneeCache.get(pending.name);
  if (cached) return cached;

  let departmentId: number | null = null;
  if (pending.department) {
    departmentId = await resolveOrCreateByName(pending.department, departments, departmentCache, (p) => createDepartment({ ...p, sortOrder: 0 }));
  }

  const created = await createAssignee({ name: pending.name, departmentId });
  assigneeCache.set(pending.name, created.id);
  return created.id;
}

export async function resolveOrCreateReferrer(
  pending: PendingReferrer,
  companies: Company[],
  branches: CompanyBranch[],
  referrerCache: Map<string, number>,
  companyCache: Map<string, number>,
  branchCache: Map<string, number>
): Promise<number> {
  const cacheKey = `${pending.company}\0${pending.department ?? ''}`;
  const cached = referrerCache.get(cacheKey);
  if (cached) return cached;

  const companyId = await resolveOrCreateByName(pending.company, companies, companyCache, createCompany);

  let branchId: number | null = null;
  if (pending.department) {
    const branchKey = `${companyId}\0${pending.department}`;
    const cachedBranch = branchCache.get(branchKey);
    if (cachedBranch) {
      branchId = cachedBranch;
    } else {
      const existingBranch = branches.find(b => b.companyId === companyId && b.name === pending.department);
      if (existingBranch) {
        branchId = existingBranch.id;
        branchCache.set(branchKey, existingBranch.id);
      } else {
        const created = await createCompanyBranch({ companyId, name: pending.department });
        branchId = created.id;
        branchCache.set(branchKey, created.id);
      }
    }
  }

  const created = await createReferrer({ companyId, branchId });
  referrerCache.set(cacheKey, created.id);
  return created.id;
}
