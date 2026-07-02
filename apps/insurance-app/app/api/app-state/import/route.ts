import { NextRequest, NextResponse } from 'next/server';
import { saveAppState } from '@/services/appState';
import { validateAppState } from '@/validators/appState';
import type { AppState } from '@/types';

export const dynamic = 'force-dynamic';

function getCaseId(request: NextRequest): string {
  return request.nextUrl.searchParams.get('caseId') || 'default';
}

function normalizeImportData(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') {
    throw new Error('JSONデータが不正です');
  }

  const data = raw as Partial<AppState> & { data?: Partial<AppState> };
  const source = data.data && typeof data.data === 'object' ? data.data : data;

  return {
    familyMembers: source.familyMembers,
    agency: source.agency,
    policies: source.policies,
  } as AppState;
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? '';
    let parsed: unknown;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'JSONファイルが指定されていません' }, { status: 400 });
      }

      if (!file.name.toLowerCase().endsWith('.json')) {
        return NextResponse.json({ error: 'JSONファイル(.json)のみ対応しています' }, { status: 400 });
      }

      parsed = JSON.parse(await file.text());
    } else if (contentType.includes('application/json')) {
      parsed = await request.json();
    } else {
      return NextResponse.json({ error: 'Content-Typeはmultipart/form-dataまたはapplication/jsonが必要です' }, { status: 415 });
    }

    const state = normalizeImportData(parsed);
    const { valid, errors } = validateAppState(state);

    if (!valid) {
      return NextResponse.json({ error: 'AppState形式のJSONではありません', errors }, { status: 400 });
    }

    const saved = saveAppState(getCaseId(request), state);
    return NextResponse.json(saved);
  } catch (err) {
    console.error('[POST /api/app-state/import]', err);
    return NextResponse.json({ error: 'JSON復元に失敗しました' }, { status: 500 });
  }
}
