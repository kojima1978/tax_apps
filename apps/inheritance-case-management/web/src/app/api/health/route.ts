import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      { status: 'OK', database: 'connected', timestamp: new Date().toISOString() },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    // 落ちた後にログから原因を追えるように残す（以前は黙って 503 を返していた）
    console.error('[health] DB に接続できません:', error);
    return NextResponse.json(
      { status: 'ERROR', database: 'disconnected', timestamp: new Date().toISOString() },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
