import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';
import { selectedCaseIdsSchema } from '@/types/validation';
import { bulkDeleteCases } from '@/lib/services/case-service';

export async function DELETE(request: NextRequest) {
  try {
    const { ids } = selectedCaseIdsSchema.parse(await request.json());
    const deleted = await bulkDeleteCases({ id: { in: [...new Set(ids)] } });
    return NextResponse.json({ deleted });
  } catch (e) {
    return handleApiError(e);
  }
}
