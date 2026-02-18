import type { Referrer } from '@tax-apps/shared';
import type { CreateReferrerInput, UpdateReferrerInput } from '@tax-apps/validation';
import { createCrudApi } from './crud-factory';

const api = createCrudApi<Referrer, CreateReferrerInput, UpdateReferrerInput>('/referrers');

export const getReferrers = api.getAll;
export const createReferrer = api.create;
export const updateReferrer = api.update;
export const deleteReferrer = api.remove;
