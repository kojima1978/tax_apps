import type { Company } from '@/types/shared';
import type { CreateCompanyInput, UpdateCompanyInput } from '@/types/validation';
import { createCrudApi } from './crud-factory';

const api = createCrudApi<Company, CreateCompanyInput, UpdateCompanyInput>('/companies');

export const getCompanies = api.getAll;
export const createCompany = api.create;
export const updateCompany = api.update;
export const deleteCompany = api.remove;
