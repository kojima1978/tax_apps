import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';
import { createCaseSchema, listQuerySchema } from '@/types/validation';
import { buildCaseWhereClause, listCases, createCase } from '@/lib/services/case-service';

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = listQuerySchema.parse(searchParams);

    const where = buildCaseWhereClause(query);
    const result = await listCases({
      where,
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      view: query.view,
    });

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
