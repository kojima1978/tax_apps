import { NextResponse } from 'next/server';
import { checkDbHealth } from '@/lib/db';

export const dynamic = 'force-dynamic';

// DB が使えないときは 503 を返して healthcheck を落とす（以前は DB の失敗を
// database: 'error' に書くだけで 200 を返していたので、誰にも届かなかった）
export function GET() {
  const dbError = checkDbHealth();
  if (dbError !== null) {
    return NextResponse.json({ status: 'degraded', database: dbError }, { status: 503 });
  }
  return NextResponse.json({ status: 'ok', database: 'ok' });
}
