import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { saveAppState } from '@/services/appState';
import { updateCaseTitle } from '@/services/cases';
import { saveInsights, type PortfolioInsightRow } from '@/services/portfolioInsights';
import { validateAppState, validatePortfolioInsights } from '@/validators/appState';
import type { AppState } from '@/types';

export const dynamic = 'force-dynamic';

interface ImportPayload {
  state: AppState;
  caseTitle?: string;
  portfolioInsights?: unknown;
}

function getCaseId(request: NextRequest): string {
  return request.nextUrl.searchParams.get('caseId') || 'default';
}

function normalizeImportData(raw: unknown): ImportPayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('JSONデータが不正です');
  }

  const data = raw as Partial<AppState> & { data?: Partial<AppState> };
  const source = (data.data && typeof data.data === 'object' ? data.data : data) as Partial<AppState> & {
    caseTitle?: unknown;
    portfolioInsights?: unknown;
  };

  return {
    state: {
      familyMembers: source.familyMembers,
      agency: source.agency,
      policies: source.policies,
    } as AppState,
    caseTitle: typeof source.caseTitle === 'string' && source.caseTitle.trim() ? source.caseTitle.trim() : undefined,
    portfolioInsights: source.portfolioInsights,
  };
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

    const payload = normalizeImportData(parsed);
    const { valid, errors } = validateAppState(payload.state);

    if (!valid) {
      return NextResponse.json({ error: 'AppState形式のJSONではありません', errors }, { status: 400 });
    }

    // schemaVersion 2 で追加された項目。存在する場合のみ検証・復元する(旧形式JSONは従来どおり)
    if (payload.portfolioInsights !== undefined) {
      const insightsResult = validatePortfolioInsights(payload.portfolioInsights);
      if (!insightsResult.valid) {
        return NextResponse.json({ error: 'portfolioInsights の形式が不正です', errors: insightsResult.errors }, { status: 400 });
      }
    }

    // id はテーブル全体の主キーのため、エクスポート元の案件が同じDBに残っていると衝突する。
    // インポート時は常に新しいidを振り直し、証券の被保険者/受取人の参照も追随させる
    const memberIdMap = new Map(payload.state.familyMembers.map(m => [m.id, uuidv4()]));
    const state: AppState = {
      ...payload.state,
      familyMembers: payload.state.familyMembers.map(m => ({ ...m, id: memberIdMap.get(m.id) ?? m.id })),
      policies: payload.state.policies.map(p => ({
        ...p,
        id: uuidv4(),
        insuredId: memberIdMap.get(p.insuredId) ?? p.insuredId,
        beneficiaryId: p.beneficiaryId ? memberIdMap.get(p.beneficiaryId) ?? p.beneficiaryId : p.beneficiaryId,
      })),
    };

    const caseId = getCaseId(request);
    const saved = saveAppState(caseId, state);

    if (payload.caseTitle) {
      updateCaseTitle(caseId, payload.caseTitle);
    }
    if (payload.portfolioInsights !== undefined) {
      const insights = payload.portfolioInsights as Pick<PortfolioInsightRow, 'type' | 'text' | 'isCustom'>[];
      saveInsights(caseId, insights.map(({ type, text, isCustom }) => ({ type, text, isCustom: !!isCustom })));
    }

    return NextResponse.json(saved);
  } catch (err) {
    console.error('[POST /api/app-state/import]', err);
    return NextResponse.json({ error: 'JSON復元に失敗しました' }, { status: 500 });
  }
}
