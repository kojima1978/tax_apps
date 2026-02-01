import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import {
  createCaseSchema,
  updateCaseSchema,
  caseIdParamSchema,
  listQuerySchema,
} from '@tax-apps/validation';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

export const casesRouter = new Hono();

// GET /api/cases - List cases with pagination, filtering, and sorting
casesRouter.get(
  '/',
  zValidator('query', listQuerySchema),
  async (c) => {
    const { page, pageSize, status, acceptanceStatus, fiscalYear, search, sortBy, sortOrder } = c.req.valid('query');

    // Build where clause for filtering
    const where: Prisma.InheritanceCaseWhereInput = {};

    if (status) {
      where.status = status;
    }
    if (acceptanceStatus) {
      where.acceptanceStatus = acceptanceStatus;
    }
    if (fiscalYear) {
      where.fiscalYear = fiscalYear;
    }
    if (search) {
      where.deceasedName = { contains: search, mode: 'insensitive' };
    }

    // Get total count for pagination
    const total = await prisma.inheritanceCase.count({ where });

    // Get paginated cases with sorting
    const cases = await prisma.inheritanceCase.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return c.json({
      data: cases,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  }
);

// GET /api/cases/:id - Single case
casesRouter.get(
  '/:id',
  zValidator('param', caseIdParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const caseItem = await prisma.inheritanceCase.findUnique({
      where: { id },
    });

    if (!caseItem) {
      return c.json({ error: 'Case not found', code: 'NOT_FOUND' }, 404);
    }

    return c.json(caseItem);
  }
);

// POST /api/cases - Create case
casesRouter.post(
  '/',
  zValidator('json', createCaseSchema),
  async (c) => {
    const data = c.req.valid('json');

    const newCase = await prisma.inheritanceCase.create({
      data: {
        deceasedName: data.deceasedName,
        dateOfDeath: data.dateOfDeath,
        fiscalYear: data.fiscalYear,
        status: data.status ?? '未着手',
        acceptanceStatus: data.acceptanceStatus ?? '未判定',
        taxAmount: data.taxAmount ?? 0,
        assignee: data.assignee,
        feeAmount: data.feeAmount ?? 0,
        referrer: data.referrer,
        estimateAmount: data.estimateAmount ?? 0,
        propertyValue: data.propertyValue ?? 0,
        referralFeeRate: data.referralFeeRate,
        referralFeeAmount: data.referralFeeAmount,
        contacts: data.contacts ?? [],
        progress: data.progress ?? [],
      },
    });

    logger.info({ caseId: newCase.id }, 'Case created');
    return c.json(newCase, 201);
  }
);

// PUT /api/cases/:id - Update case
casesRouter.put(
  '/:id',
  zValidator('param', caseIdParamSchema),
  zValidator('json', updateCaseSchema),
  async (c) => {
    const { id } = c.req.valid('param');
    const data = c.req.valid('json');

    // Check if case exists
    const existing = await prisma.inheritanceCase.findUnique({
      where: { id },
    });

    if (!existing) {
      return c.json({ error: '案件が見つかりません', code: 'NOT_FOUND' }, 404);
    }

    const updated = await prisma.inheritanceCase.update({
      where: { id },
      data,
    });

    logger.info({ caseId: id }, 'Case updated');
    return c.json(updated);
  }
);

// DELETE /api/cases/:id - Delete case
casesRouter.delete(
  '/:id',
  zValidator('param', caseIdParamSchema),
  async (c) => {
    const { id } = c.req.valid('param');

    // Check if case exists
    const existing = await prisma.inheritanceCase.findUnique({
      where: { id },
    });

    if (!existing) {
      return c.json({ error: '案件が見つかりません', code: 'NOT_FOUND' }, 404);
    }

    await prisma.inheritanceCase.delete({
      where: { id },
    });

    logger.info({ caseId: id }, 'Case deleted');
    return c.body(null, 204);
  }
);
