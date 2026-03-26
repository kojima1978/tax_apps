import { createCrudRouteHandlers } from '@/lib/create-crud-route-handlers';
import { createDepartmentSchema, updateDepartmentSchema } from '@/types/validation';

export const { listAndCreate, byId } = createCrudRouteHandlers({
  model: 'department',
  orderBy: 'sortOrder',
  entityLabel: '部署',
  createSchema: createDepartmentSchema,
  updateSchema: updateDepartmentSchema,
});
