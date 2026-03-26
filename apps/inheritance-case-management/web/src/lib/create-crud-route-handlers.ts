import { NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';
import { prisma } from './prisma';
import { handleApiError } from './api-error-handler';

interface CrudRouteConfig {
  /** Prisma model name (e.g. 'assignee', 'referrer') */
  model: string;
  /** Field to order by in list query */
  orderBy: string;
  /** Japanese entity label for error messages */
  entityLabel: string;
  /** Zod schema for create validation */
  createSchema: z.ZodType;
  /** Zod schema for update validation */
  updateSchema: z.ZodType;
  /** Optional Prisma include for relation loading */
  include?: Record<string, unknown>;
}

type PrismaDelegate = {
  findMany: (args: unknown) => Promise<unknown>;
  findUnique: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<Record<string, unknown>>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
};

function getDelegate(model: string): PrismaDelegate {
  return (prisma as unknown as Record<string, unknown>)[model] as PrismaDelegate;
}

export function createCrudRouteHandlers(config: CrudRouteConfig) {
  const { model, orderBy, entityLabel, createSchema, updateSchema, include } = config;
  const delegate = getDelegate(model);

  // GET /api/{resource} + POST /api/{resource}
  const listAndCreate = {
    async GET() {
      try {
        const items = await delegate.findMany({ orderBy: { [orderBy]: 'asc' }, ...(include && { include }) });
        return NextResponse.json(items);
      } catch (e) {
        return handleApiError(e);
      }
    },

    async POST(request: NextRequest) {
      try {
        const body = await request.json();
        const data = createSchema.parse(body);
        const created = await delegate.create({ data: { ...data, active: true }, ...(include && { include }) });
        return NextResponse.json(created, { status: 201 });
      } catch (e) {
        return handleApiError(e);
      }
    },
  };

  // GET /api/{resource}/[id] + PUT + DELETE
  const byId = {
    async GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
      try {
        const { id: rawId } = await params;
        const id = Number(rawId);
        const item = await delegate.findUnique({ where: { id }, ...(include && { include }) });
        if (!item) {
          return NextResponse.json({ error: `${entityLabel}が見つかりません`, code: 'NOT_FOUND' }, { status: 404 });
        }
        return NextResponse.json(item);
      } catch (e) {
        return handleApiError(e);
      }
    },

    async PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
      try {
        const { id: rawId } = await params;
        const id = Number(rawId);
        const body = await request.json();
        const data = updateSchema.parse(body);
        const updated = await delegate.update({ where: { id }, data, ...(include && { include }) });
        return NextResponse.json(updated);
      } catch (e) {
        return handleApiError(e);
      }
    },

    async DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
      try {
        const { id: rawId } = await params;
        const id = Number(rawId);
        await delegate.delete({ where: { id } });
        return new NextResponse(null, { status: 204 });
      } catch (e) {
        return handleApiError(e);
      }
    },
  };

  return { listAndCreate, byId };
}
