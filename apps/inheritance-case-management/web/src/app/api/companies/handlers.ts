import { createCrudRouteHandlers } from '@/lib/create-crud-route-handlers';
import { createCompanySchema, updateCompanySchema } from '@/types/validation';

export const { listAndCreate, byId } = createCrudRouteHandlers({
  model: 'company',
  orderBy: 'name',
  entityLabel: '会社',
  createSchema: createCompanySchema,
  updateSchema: updateCompanySchema,
});
