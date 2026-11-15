import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';
import { importAdministrativeFeeItems } from '@/lib/services/administrative-fee-service';
import { importAdministrativeFeeItemsSchema } from '@/types/validation';

/** 料金表の取込（分類＋手続き内容で突き合わせ、無い行は追加。表に無い行は消さない） */
export async function POST(request: NextRequest) {
  try {
    const { items } = importAdministrativeFeeItemsSchema.parse(await request.json());
    return NextResponse.json(await importAdministrativeFeeItems(items));
  } catch (e) {
    return handleApiError(e);
  }
}
