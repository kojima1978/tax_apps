import type { Company, CompanyBranch, Department, Assignee, Referrer, HeirPerson, RelatedPartyPerson } from '@/types/shared';
import type {
  CreateCompanyInput, UpdateCompanyInput,
  CreateCompanyBranchInput, UpdateCompanyBranchInput,
  CreateDepartmentInput, UpdateDepartmentInput,
  CreateAssigneeInput, UpdateAssigneeInput,
  CreateReferrerInput, UpdateReferrerInput,
  CreateHeirPersonInput, UpdateHeirPersonInput,
  CreateRelatedPartyPersonInput, UpdateRelatedPartyPersonInput,
} from '@/types/validation';
import { createCrudApi } from './crud-factory';

const companyApi = createCrudApi<Company, CreateCompanyInput, UpdateCompanyInput>('/companies');
export const getCompanies = companyApi.getAll;
export const createCompany = companyApi.create;
export const updateCompany = companyApi.update;
export const deleteCompany = companyApi.remove;

const companyBranchApi = createCrudApi<CompanyBranch, CreateCompanyBranchInput, UpdateCompanyBranchInput>('/company-branches');
export const getCompanyBranches = companyBranchApi.getAll;
export const createCompanyBranch = companyBranchApi.create;
export const updateCompanyBranch = companyBranchApi.update;
export const deleteCompanyBranch = companyBranchApi.remove;

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

const heirPersonApi = createCrudApi<HeirPerson, CreateHeirPersonInput, UpdateHeirPersonInput>('/heir-persons');
export const getHeirPersons = heirPersonApi.getAll;
export const createHeirPerson = heirPersonApi.create;
export const updateHeirPerson = heirPersonApi.update;
export const deleteHeirPerson = heirPersonApi.remove;

const relatedPartyPersonApi = createCrudApi<RelatedPartyPerson, CreateRelatedPartyPersonInput, UpdateRelatedPartyPersonInput>('/related-party-persons');
export const getRelatedPartyPersons = relatedPartyPersonApi.getAll;
export const createRelatedPartyPerson = relatedPartyPersonApi.create;
export const updateRelatedPartyPerson = relatedPartyPersonApi.update;
export const deleteRelatedPartyPerson = relatedPartyPersonApi.remove;
