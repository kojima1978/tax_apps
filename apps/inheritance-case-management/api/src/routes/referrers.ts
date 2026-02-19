import { createReferrerSchema, updateReferrerSchema } from '../schemas/validation.js';
import { createCrudRouter } from '../lib/create-crud-router.js';

export const referrersRouter = createCrudRouter({
  model: 'referrer',
  orderBy: 'company',
  entityLabel: '紹介者',
  createSchema: createReferrerSchema,
  updateSchema: updateReferrerSchema,
});
