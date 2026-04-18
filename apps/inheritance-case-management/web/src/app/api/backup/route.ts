import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';
import { exportBackup } from '@/lib/services/backup-service';

export async function GET() {
  try {
    const result = await exportBackup();
    return NextResponse.json(result);
  } catch (e) {
    return handleApiError(e);
  }
}
