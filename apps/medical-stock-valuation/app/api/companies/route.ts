import { createMasterRouteHandlers } from '@/lib/api-utils';

const handlers = createMasterRouteHandlers({
  tableName: 'companies',
  nameField: 'company_name',
  entityLabel: '会社',
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
