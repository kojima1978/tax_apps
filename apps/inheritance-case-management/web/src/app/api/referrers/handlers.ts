import { createCrudRouteHandlers } from '@/lib/create-crud-route-handlers';
import { createReferrerSchema, updateReferrerSchema } from '@/types/validation';

export const { listAndCreate, byId } = createCrudRouteHandlers({
  model: 'referrer',
  orderBy: 'company',
  entityLabel: '紹介者',
  createSchema: createReferrerSchema,
  updateSchema: updateReferrerSchema,
});
