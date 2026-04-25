import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';
import { mergeCompanies } from '@/lib/services/merge-service';
import { z } from 'zod';

const mergeSchema = z.object({
  sourceId: z.number().int().positive(),
  targetId: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, targetId } = mergeSchema.parse(body);
    const result = await mergeCompanies(sourceId, targetId);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Error && e.message.includes('マージ')) {
      return NextResponse.json({ error: e.message, code: 'MERGE_ERROR' }, { status: 400 });
    }
    return handleApiError(e);
  }
}
