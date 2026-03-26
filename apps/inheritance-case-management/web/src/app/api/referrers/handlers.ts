import { createCrudRouteHandlers } from '@/lib/create-crud-route-handlers';
import { createReferrerSchema, updateReferrerSchema } from '@/types/validation';
import { REFERRER_INCLUDE } from '@/lib/prisma-includes';

export const { listAndCreate, byId } = createCrudRouteHandlers({
  model: 'referrer',
  orderBy: 'name',
  entityLabel: '紹介者',
  createSchema: createReferrerSchema,
  updateSchema: updateReferrerSchema,
  include: REFERRER_INCLUDE,
});
