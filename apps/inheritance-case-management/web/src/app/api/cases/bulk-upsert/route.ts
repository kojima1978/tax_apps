import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';
import { createCaseSchema } from '@/types/validation';
import { bulkUpsertCases } from '@/lib/services/case-service';
import type { BulkUpsertItem } from '@/lib/services/case-service';
import { z } from 'zod';

const bulkUpsertSchema = z.object({
  items: z.array(z.object({
    mode: z.enum(['create', 'update']),
    id: z.number().optional(),
    data: createCaseSchema,
  })).min(1).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = bulkUpsertSchema.parse(body);
    const result = await bulkUpsertCases(items as BulkUpsertItem[]);
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}
