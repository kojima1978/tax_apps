import type { Assignee } from '@/types/shared';
import type { CreateAssigneeInput, UpdateAssigneeInput } from '@/types/validation';
import { createCrudApi } from './crud-factory';

const api = createCrudApi<Assignee, CreateAssigneeInput, UpdateAssigneeInput>('/assignees');

export const getAssignees = api.getAll;
export const createAssignee = api.create;
export const updateAssignee = api.update;
export const deleteAssignee = api.remove;
