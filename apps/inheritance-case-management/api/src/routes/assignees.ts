import { createAssigneeSchema, updateAssigneeSchema } from '@tax-apps/validation';
import { createCrudRouter } from '../lib/create-crud-router.js';

export const assigneesRouter = createCrudRouter({
  model: 'assignee',
  orderBy: 'name',
  entityLabel: '担当者',
  createSchema: createAssigneeSchema,
  updateSchema: updateAssigneeSchema,
});
