import { createCrudRouteHandlers } from '@/lib/create-crud-route-handlers';
import { createAssigneeSchema, updateAssigneeSchema } from '@/types/validation';

export const { listAndCreate, byId } = createCrudRouteHandlers({
  model: 'assignee',
  orderBy: 'name',
  entityLabel: '担当者',
  createSchema: createAssigneeSchema,
  updateSchema: updateAssigneeSchema,
});
