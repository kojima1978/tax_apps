import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import type { z } from 'zod';
import { prisma } from './prisma.js';
import { logger } from './logger.js';
import { idParamSchema } from './schemas.js';

interface CrudRouterConfig {
  /** Prisma model name (e.g. 'assignee', 'referrer') */
  model: keyof typeof prisma & string;
  /** Field to order by in list query */
  orderBy: string;
  /** Japanese entity label for error messages and logs */
  entityLabel: string;
  /** Zod schema for create validation */
  createSchema: z.ZodType;
  /** Zod schema for update validation */
  updateSchema: z.ZodType;
}

export function createCrudRouter(config: CrudRouterConfig): Hono {
  const { model, orderBy, entityLabel, createSchema, updateSchema } = config;
  const delegate = (prisma as unknown as Record<string, unknown>)[model] as {
    findMany: (args: unknown) => Promise<unknown>;
    findUnique: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<Record<string, unknown>>;
    update: (args: unknown) => Promise<unknown>;
    delete: (args: unknown) => Promise<unknown>;
  };

  const router = new Hono();

  router.get('/', async (c) => {
    const items = await delegate.findMany({ orderBy: { [orderBy]: 'asc' } });
    return c.json(items);
  });

  router.get('/:id', zValidator('param', idParamSchema), async (c) => {
    const { id } = c.req.valid('param');
    const item = await delegate.findUnique({ where: { id } });
    if (!item) return c.json({ error: `${entityLabel}が見つかりません`, code: 'NOT_FOUND' }, 404);
    return c.json(item);
  });

  router.post('/', zValidator('json', createSchema), async (c) => {
    const data = c.req.valid('json') as Record<string, unknown>;
    const created = await delegate.create({ data: { ...data, active: true } });
    logger.info({ [`${model}Id`]: created.id }, `${entityLabel} created`);
    return c.json(created, 201);
  });

  router.put('/:id', zValidator('param', idParamSchema), zValidator('json', updateSchema), async (c) => {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');
    const updated = await delegate.update({ where: { id }, data });
    logger.info({ [`${model}Id`]: id }, `${entityLabel} updated`);
    return c.json(updated);
  });

  router.delete('/:id', zValidator('param', idParamSchema), async (c) => {
    const { id } = c.req.valid('param');
    await delegate.delete({ where: { id } });
    logger.info({ [`${model}Id`]: id }, `${entityLabel} deleted`);
    return c.body(null, 204);
  });

  return router;
}
