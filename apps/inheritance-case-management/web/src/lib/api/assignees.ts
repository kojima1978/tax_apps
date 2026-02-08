import type { Assignee } from '@tax-apps/shared';
import type { CreateAssigneeInput, UpdateAssigneeInput } from '@tax-apps/validation';
import { createCrudApi } from './crud-factory';

const api = createCrudApi<Assignee, CreateAssigneeInput, UpdateAssigneeInput>('/assignees');

export const getAssignees = api.getAll;
export const getAssignee = api.getById;
export const createAssignee = api.create;
export const updateAssignee = api.update;
export const deleteAssignee = api.remove;
