import { NextResponse } from 'next/server';
import { getLastStaffDirectorySync, syncStaffDirectory } from '@/lib/staff-directory/sync';

// 社員台帳からの写しの状況。設定画面の「担当者・部署」が読む。
// GET は期限が来ていれば写し直してから返し、POST は期限を待たずに写し直す
export async function GET() {
  const result = (await syncStaffDirectory()) ?? getLastStaffDirectorySync();
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST() {
  const result = await syncStaffDirectory({ force: true });
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
