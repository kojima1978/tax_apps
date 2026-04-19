import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';
import { backupDataSchema } from '@/types/backup';
import { restoreBackup } from '@/lib/services/backup-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = backupDataSchema.parse(body);
    const counts = await restoreBackup(parsed.data as Record<string, Record<string, unknown>[]>);

    return NextResponse.json({ success: true, counts });
  } catch (e) {
    console.error('リストアエラー:', e);
    return handleApiError(e);
  }
}
