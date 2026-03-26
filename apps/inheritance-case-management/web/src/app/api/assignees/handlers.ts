import { createCrudRouteHandlers } from '@/lib/create-crud-route-handlers';
import { createAssigneeSchema, updateAssigneeSchema } from '@/types/validation';
import { ASSIGNEE_INCLUDE } from '@/lib/prisma-includes';

export const { listAndCreate, byId } = createCrudRouteHandlers({
  model: 'assignee',
  orderBy: 'name',
  entityLabel: '担当者',
  createSchema: createAssigneeSchema,
  updateSchema: updateAssigneeSchema,
  include: ASSIGNEE_INCLUDE,
});
