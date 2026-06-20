import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';
import { createCaseSchema, listQuerySchema } from '@/types/validation';
import { buildCaseWhereClause, listCases, createCase } from '@/lib/services/case-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { page, pageSize, status, isUndivided, hideClosed, fiscalYear, fiscalYears, search, assigneeId, internalReferrerId, staffId, referrerCompany, unassigned, noReferrer, deadlineSoon, department, caseAddedFrom, caseAddedTo, caseCompletedFrom, caseCompletedTo, billedFrom, billedTo, paidFrom, paidTo, sortBy, sortOrder } =
      listQuerySchema.parse(searchParams);

    const where = buildCaseWhereClause({ status, isUndivided, hideClosed, fiscalYear, fiscalYears, search, assigneeId, internalReferrerId, staffId, referrerCompany, unassigned, noReferrer, deadlineSoon, department, caseAddedFrom, caseAddedTo, caseCompletedFrom, caseCompletedTo, billedFrom, billedTo, paidFrom, paidTo });
    const result = await listCases({ where, page, pageSize, sortBy, sortOrder });

    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createCaseSchema.parse(body);
    const newCase = await createCase(data);

    return NextResponse.json(newCase, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
