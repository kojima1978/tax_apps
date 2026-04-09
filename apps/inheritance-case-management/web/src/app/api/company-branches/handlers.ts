import { createCrudRouteHandlers } from '@/lib/create-crud-route-handlers';
import { createCompanyBranchSchema, updateCompanyBranchSchema } from '@/types/validation';

export const { listAndCreate, byId } = createCrudRouteHandlers({
  model: 'companyBranch',
  orderBy: 'name',
  entityLabel: '部門',
  createSchema: createCompanyBranchSchema,
  updateSchema: updateCompanyBranchSchema,
  include: { company: true },
});
