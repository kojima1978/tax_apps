import { NextResponse } from 'next/server';
import { checkDbHealth } from '@/lib/db';

export const dynamic = 'force-dynamic';

// healthcheck 用。以前はトップページが開くかだけを見ていたので、DB が
// 使えなくても healthy のままだった。
export function GET() {
  const dbError = checkDbHealth();
  if (dbError !== null) {
    return NextResponse.json({ status: 'degraded', database: dbError }, { status: 503 });
  }
  return NextResponse.json({ status: 'ok', database: 'ok' });
}
