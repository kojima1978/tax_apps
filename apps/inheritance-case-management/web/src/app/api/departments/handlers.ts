import { createCrudRouteHandlers } from '@/lib/create-crud-route-handlers';
import { syncStaffDirectory } from '@/lib/staff-directory/sync';
import { createDepartmentSchema, updateDepartmentSchema } from '@/types/validation';

// 部署・担当者は社員台帳の写し。書き込みの口（POST/PUT/DELETE）は route.ts で出さない
export const { listAndCreate, byId } = createCrudRouteHandlers({
  model: 'department',
  orderBy: 'sortOrder',
  entityLabel: '部署',
  createSchema: createDepartmentSchema,
  updateSchema: updateDepartmentSchema,
  beforeList: () => syncStaffDirectory(),
});
