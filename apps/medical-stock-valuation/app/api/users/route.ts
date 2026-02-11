import { createMasterRouteHandlers } from '@/lib/api-utils';

const handlers = createMasterRouteHandlers({
  tableName: 'users',
  nameField: 'name',
  entityLabel: '担当者',
});

export const GET = handlers.GET;
export const POST = handlers.POST;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
