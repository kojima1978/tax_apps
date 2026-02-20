import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { isPrismaNotFound } from './prisma-utils';

export function handleApiError(e: unknown): NextResponse {
  // Zod validation error
  if (e instanceof ZodError) {
    return NextResponse.json(
      { error: 'バリデーションエラー', code: 'VALIDATION_ERROR', details: e.errors },
      { status: 400 }
    );
  }

  // Prisma not found
  if (isPrismaNotFound(e)) {
    return NextResponse.json(
      { error: 'リソースが見つかりません', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  // Prisma known request error (e.g. unique constraint)
  if (e instanceof Error && e.name === 'PrismaClientKnownRequestError') {
    return NextResponse.json(
      { error: 'データベースエラー', code: 'DB_ERROR' },
      { status: 400 }
    );
  }

  // Unknown error
  console.error('Unhandled API error:', e);
  return NextResponse.json(
    { error: 'サーバーエラーが発生しました', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}
