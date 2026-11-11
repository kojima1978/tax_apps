import { NextResponse } from 'next/server';
import { getStaffDirectorySyncStatus, syncStaffDirectory } from '@/lib/staff-directory/sync';
import { parseTrigger } from '@/lib/staff-directory/run-log';

// 社員台帳からの写しの状況。設定画面の「担当者・部署」と、社員台帳の連携の画面が読む。
// GET は記録を読むだけ（写しは走らせない）。POST は期限を待たずに写し直す ──
// 社員台帳が保存のたびに `{ "trigger": "directory" }` で呼び、画面の「今すぐ読み直す」は本文なしで呼ぶ
export async function GET() {
  return NextResponse.json(await getStaffDirectorySyncStatus(), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = await syncStaffDirectory(parseTrigger(body));
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
