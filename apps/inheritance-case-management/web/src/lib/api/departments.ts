import type { Department } from '@/types/shared';
import type { CreateDepartmentInput, UpdateDepartmentInput } from '@/types/validation';
import { createCrudApi } from './crud-factory';

const api = createCrudApi<Department, CreateDepartmentInput, UpdateDepartmentInput>('/departments');

export const getDepartments = api.getAll;
export const createDepartment = api.create;
export const updateDepartment = api.update;
export const deleteDepartment = api.remove;
