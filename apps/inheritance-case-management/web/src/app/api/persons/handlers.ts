import { createCrudRouteHandlers } from '@/lib/create-crud-route-handlers';
import { createPersonSchema, updatePersonSchema } from '@/types/validation';

export const { listAndCreate, byId } = createCrudRouteHandlers({
  model: 'person',
  orderBy: 'name',
  entityLabel: '人物',
  createSchema: createPersonSchema,
  updateSchema: updatePersonSchema,
});
