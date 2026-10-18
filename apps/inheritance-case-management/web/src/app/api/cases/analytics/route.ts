import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';
import { getAnalyticsCases } from '@/lib/services/analytics-service';

export async function GET() {
  try {
    return NextResponse.json(await getAnalyticsCases());
  } catch (error) {
    return handleApiError(error);
  }
}
