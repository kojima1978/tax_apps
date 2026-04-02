import type { Company, Department, Assignee, Referrer } from '@/types/shared';
import type {
  CreateCompanyInput, UpdateCompanyInput,
  CreateDepartmentInput, UpdateDepartmentInput,
  CreateAssigneeInput, UpdateAssigneeInput,
  CreateReferrerInput, UpdateReferrerInput,
} from '@/types/validation';
import { createCrudApi } from './crud-factory';

const companyApi = createCrudApi<Company, CreateCompanyInput, UpdateCompanyInput>('/companies');
export const getCompanies = companyApi.getAll;
export const createCompany = companyApi.create;
export const updateCompany = companyApi.update;
export const deleteCompany = companyApi.remove;

const departmentApi = createCrudApi<Department, CreateDepartmentInput, UpdateDepartmentInput>('/departments');
export const getDepartments = departmentApi.getAll;
export const createDepartment = departmentApi.create;
export const updateDepartment = departmentApi.update;
export const deleteDepartment = departmentApi.remove;

const assigneeApi = createCrudApi<Assignee, CreateAssigneeInput, UpdateAssigneeInput>('/assignees');
export const getAssignees = assigneeApi.getAll;
export const createAssignee = assigneeApi.create;
export const updateAssignee = assigneeApi.update;
export const deleteAssignee = assigneeApi.remove;

const referrerApi = createCrudApi<Referrer, CreateReferrerInput, UpdateReferrerInput>('/referrers');
export const getReferrers = referrerApi.getAll;
export const createReferrer = referrerApi.create;
export const updateReferrer = referrerApi.update;
export const deleteReferrer = referrerApi.remove;
