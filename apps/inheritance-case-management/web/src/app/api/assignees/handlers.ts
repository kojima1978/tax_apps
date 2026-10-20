import { createCrudRouteHandlers } from '@/lib/create-crud-route-handlers';
import { syncStaffDirectory } from '@/lib/staff-directory/sync';
import { createAssigneeSchema, updateAssigneeSchema } from '@/types/validation';
import { ASSIGNEE_INCLUDE } from '@/lib/prisma-includes';

// 部署・担当者は社員台帳の写し。書き込みの口（POST/PUT/DELETE）は route.ts で出さない
export const { listAndCreate, byId } = createCrudRouteHandlers({
  model: 'assignee',
  orderBy: 'name',
  entityLabel: '担当者',
  createSchema: createAssigneeSchema,
  updateSchema: updateAssigneeSchema,
  include: ASSIGNEE_INCLUDE,
  beforeList: () => syncStaffDirectory(),
});
