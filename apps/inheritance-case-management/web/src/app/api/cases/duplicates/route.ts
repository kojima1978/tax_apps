import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error-handler';
import { toDateStr } from '@/lib/prisma-includes';
import { findCaseDuplicates } from '@/lib/case-duplicates';
import { isRealIsoDate } from '@/lib/japanese-era';
import type { CaseStatus } from '@/types/shared';

const querySchema = z.object({
    deceasedName: z.string().max(200).default(''),
    deceasedNameKana: z.string().max(200).optional(),
    dateOfDeath: z.string().refine(isRealIsoDate).optional(),
});

export async function GET(request: NextRequest) {
    try {
        const input = querySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
        if (!input.deceasedName.trim() && !input.deceasedNameKana?.trim()) {
            return NextResponse.json({ candidates: [], total: 0 });
        }
        // Check all years/statuses. Only identity fields are read; no detail collections.
        const records = await prisma.inheritanceCase.findMany({
            select: { id: true, deceasedName: true, deceasedNameKana: true, dateOfDeath: true, fiscalYear: true, status: true },
        });
        const result = findCaseDuplicates(records.map(record => ({
            ...record, dateOfDeath: toDateStr(record.dateOfDeath) ?? '', status: record.status as CaseStatus,
        })), input);
        return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        return handleApiError(error);
    }
}
