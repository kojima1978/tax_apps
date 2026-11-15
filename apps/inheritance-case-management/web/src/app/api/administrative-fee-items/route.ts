import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';
import { createAdministrativeFeeItem, listAdministrativeFeeItems } from '@/lib/services/administrative-fee-service';
import { createAdministrativeFeeItemSchema } from '@/types/validation';

export async function GET() {
  try {
    return NextResponse.json(await listAdministrativeFeeItems());
  } catch (e) {
    return handleApiError(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = createAdministrativeFeeItemSchema.parse(await request.json());
    return NextResponse.json(await createAdministrativeFeeItem(parsed), { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
