import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  createReferrerSchema,
  updateReferrerSchema,
} from '@tax-apps/validation';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

const idParamSchema = z.object({
  id: z.string().uuid('無効なID形式です'),
});

export const referrersRouter = new Hono();

// GET /api/referrers - All referrers
referrersRouter.get('/', async (c) => {
  const referrers = await prisma.referrer.findMany({
    orderBy: { company: 'asc' },
  });
  return c.json(referrers);
});

// GET /api/referrers/:id - Single referrer
referrersRouter.get(
  '/:id',
  zValidator('param', idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const referrer = await prisma.referrer.findUnique({
      where: { id },
    });

    if (!referrer) {
      return c.json({ error: 'Referrer not found', code: 'NOT_FOUND' }, 404);
    }

    return c.json(referrer);
  }
);

// POST /api/referrers - Create referrer
referrersRouter.post(
  '/',
  zValidator('json', createReferrerSchema),
  async (c) => {
    const data = c.req.valid('json');

    const newReferrer = await prisma.referrer.create({
      data: {
        company: data.company,
        name: data.name,
        department: data.department,
        active: true,
      },
    });

    logger.info({ referrerId: newReferrer.id }, 'Referrer created');
    return c.json(newReferrer, 201);
  }
);

// PUT /api/referrers/:id - Update referrer
referrersRouter.put(
  '/:id',
  zValidator('param', idParamSchema),
  zValidator('json', updateReferrerSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');

    const updated = await prisma.referrer.update({
      where: { id },
      data,
    });

    logger.info({ referrerId: id }, 'Referrer updated');
    return c.json(updated);
  }
);

// DELETE /api/referrers/:id - Delete referrer
referrersRouter.delete(
  '/:id',
  zValidator('param', idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');

    await prisma.referrer.delete({
      where: { id },
    });

    logger.info({ referrerId: id }, 'Referrer deleted');
    return c.body(null, 204);
  }
);
