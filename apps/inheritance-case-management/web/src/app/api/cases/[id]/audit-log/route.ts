import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';
import { caseIdParamSchema } from '@/types/validation';
import { getAuditLogs } from '@/lib/services/audit-service';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = caseIdParamSchema.parse(await params);
    const logs = await getAuditLogs('InheritanceCase', id);
    return NextResponse.json(logs);
  } catch (e) {
    return handleApiError(e);
  }
}
