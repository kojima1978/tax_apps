import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';
import { buildCaseWhereClause } from '@/lib/services/case-query';
import { getCaseKpis } from '@/lib/services/case-kpi-service';
import { listQuerySchema } from '@/types/validation';

export async function GET(request: NextRequest) {
  try {
    const query = listQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const data = await getCaseKpis(buildCaseWhereClause(query));
    return NextResponse.json(data);
  } catch (error) {
    return handleApiError(error);
  }
}
