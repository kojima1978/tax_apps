import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  createAssigneeSchema,
  updateAssigneeSchema,
} from '@tax-apps/validation';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

const idParamSchema = z.object({
  id: z.string().uuid('無効なID形式です'),
});

export const assigneesRouter = new Hono();

// GET /api/assignees - All assignees
assigneesRouter.get('/', async (c) => {
  const assignees = await prisma.assignee.findMany({
    orderBy: { name: 'asc' },
  });
  return c.json(assignees);
});

// GET /api/assignees/:id - Single assignee
assigneesRouter.get(
  '/:id',
  zValidator('param', idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const assignee = await prisma.assignee.findUnique({
      where: { id },
    });

    if (!assignee) {
      return c.json({ error: 'Assignee not found', code: 'NOT_FOUND' }, 404);
    }

    return c.json(assignee);
  }
);

// POST /api/assignees - Create assignee
assigneesRouter.post(
  '/',
  zValidator('json', createAssigneeSchema),
  async (c) => {
    const data = c.req.valid('json');

    const newAssignee = await prisma.assignee.create({
      data: {
        name: data.name,
        employeeId: data.employeeId,
        department: data.department,
        active: true,
      },
    });

    logger.info({ assigneeId: newAssignee.id }, 'Assignee created');
    return c.json(newAssignee, 201);
  }
);

// PUT /api/assignees/:id - Update assignee
assigneesRouter.put(
  '/:id',
  zValidator('param', idParamSchema),
  zValidator('json', updateAssigneeSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');

    const updated = await prisma.assignee.update({
      where: { id },
      data,
    });

    logger.info({ assigneeId: id }, 'Assignee updated');
    return c.json(updated);
  }
);

// DELETE /api/assignees/:id - Delete assignee
assigneesRouter.delete(
  '/:id',
  zValidator('param', idParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');

    await prisma.assignee.delete({
      where: { id },
    });

    logger.info({ assigneeId: id }, 'Assignee deleted');
    return c.body(null, 204);
  }
);
