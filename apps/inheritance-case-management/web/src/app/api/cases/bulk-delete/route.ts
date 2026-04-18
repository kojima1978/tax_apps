import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';
import { listQuerySchema } from '@/types/validation';
import { buildCaseWhereClause, bulkDeleteCases } from '@/lib/services/case-service';

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { status, handlingStatus, acceptanceStatus, fiscalYear, search, assigneeId, internalReferrerId, staffId, referrerCompany, unassigned, noReferrer, department } =
      listQuerySchema.parse(searchParams);

    const where = buildCaseWhereClause({ status, handlingStatus, acceptanceStatus, fiscalYear, search, assigneeId, internalReferrerId, staffId, referrerCompany, unassigned, noReferrer, department });
    const deleted = await bulkDeleteCases(where);

    return NextResponse.json({ deleted });
  } catch (e) {
    return handleApiError(e);
  }
}
