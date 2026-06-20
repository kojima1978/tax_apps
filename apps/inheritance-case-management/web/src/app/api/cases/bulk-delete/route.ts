import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';
import { listQuerySchema } from '@/types/validation';
import { buildCaseWhereClause, bulkDeleteCases } from '@/lib/services/case-service';

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { status, isUndivided, hideClosed, fiscalYear, fiscalYears, search, assigneeId, internalReferrerId, staffId, referrerCompany, unassigned, noReferrer, deadlineSoon, department, caseAddedFrom, caseAddedTo, caseCompletedFrom, caseCompletedTo, billedFrom, billedTo } =
      listQuerySchema.parse(searchParams);

    const where = buildCaseWhereClause({ status, isUndivided, hideClosed, fiscalYear, fiscalYears, search, assigneeId, internalReferrerId, staffId, referrerCompany, unassigned, noReferrer, deadlineSoon, department, caseAddedFrom, caseAddedTo, caseCompletedFrom, caseCompletedTo, billedFrom, billedTo });
    const deleted = await bulkDeleteCases(where);

    return NextResponse.json({ deleted });
  } catch (e) {
    return handleApiError(e);
  }
}
