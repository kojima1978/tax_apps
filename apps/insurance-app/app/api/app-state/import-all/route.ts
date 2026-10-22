import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createCase, deleteCase, updateCaseTitle } from '@/services/cases';
import { saveAppState } from '@/services/appState';
import { saveInsights } from '@/services/portfolioInsights';
import { validateAppState, validatePortfolioInsights } from '@/validators/appState';
import { getCasesFromJsonBackup, remapAppStateIds } from '@/lib/jsonBackup';

export const dynamic = 'force-dynamic';

const MAX_JSON_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  const createdCaseIds: string[] = [];
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'JSONファイルが指定されていません' }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith('.json')) {
      return NextResponse.json({ error: 'JSONファイル(.json)のみ対応しています' }, { status: 400 });
    }
    if (file.size > MAX_JSON_BYTES) {
      return NextResponse.json({ error: 'JSONファイルは50MB以内にしてください' }, { status: 413 });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      return NextResponse.json({ error: 'JSONの解析に失敗しました' }, { status: 400 });
    }

    const caseBackups = getCasesFromJsonBackup(parsed);
    const validationErrors: { field: string; message: string }[] = [];
    caseBackups.forEach((backup, index) => {
      const stateResult = validateAppState(backup);
      validationErrors.push(...stateResult.errors.map(error => ({
        field: `cases[${index}].${error.field}`,
        message: error.message,
      })));
      if (backup.portfolioInsights !== undefined) {
        const insightsResult = validatePortfolioInsights(backup.portfolioInsights);
        validationErrors.push(...insightsResult.errors.map(error => ({
          field: `cases[${index}].${error.field}`,
          message: error.message,
        })));
      }
    });
    if (validationErrors.length > 0) {
      return NextResponse.json({
        error: '保険アプリのJSON形式ではありません',
        errors: validationErrors,
      }, { status: 400 });
    }

    for (const backup of caseBackups) {
      const newCase = createCase();
      createdCaseIds.push(newCase.id);
      const remappedState = remapAppStateIds(backup, uuidv4);
      saveAppState(newCase.id, remappedState);
      if (backup.caseTitle) updateCaseTitle(newCase.id, backup.caseTitle);
      if (backup.portfolioInsights) saveInsights(newCase.id, backup.portfolioInsights);
    }

    return NextResponse.json({
      importedCount: createdCaseIds.length,
      caseIds: createdCaseIds,
    }, { status: 201 });
  } catch (error) {
    for (const caseId of createdCaseIds) {
      try {
        deleteCase(caseId);
      } catch (rollbackError) {
        console.error('[POST /api/app-state/import-all] rollback failed', rollbackError);
      }
    }
    console.error('[POST /api/app-state/import-all]', error);
    return NextResponse.json({ error: 'JSON復元に失敗しました' }, { status: 500 });
  }
}
