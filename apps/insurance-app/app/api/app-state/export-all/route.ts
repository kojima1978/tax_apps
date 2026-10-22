import { NextResponse } from 'next/server';
import { listCases } from '@/services/cases';
import { getAppState, updateExportTimestamp } from '@/services/appState';
import { listInsights } from '@/services/portfolioInsights';
import { allAppStatesFileName } from '@/lib/export-filename';
import {
  BULK_JSON_EXPORT_TYPE,
  BULK_JSON_SCHEMA_VERSION,
  type BulkJsonBackup,
} from '@/lib/jsonBackup';

export const dynamic = 'force-dynamic';

export function GET() {
  try {
    const cases = listCases().map(caseSummary => {
      const state = getAppState(caseSummary.id);
      if (!state) throw new Error(`案件 ${caseSummary.id} の取得に失敗しました`);
      updateExportTimestamp(caseSummary.id);
      return {
        ...state,
        caseTitle: caseSummary.title,
        portfolioInsights: listInsights(caseSummary.id).map(({ type, text, isCustom }) => ({
          type,
          text,
          isCustom,
        })),
      };
    });

    const exportData: BulkJsonBackup = {
      exportType: BULK_JSON_EXPORT_TYPE,
      schemaVersion: BULK_JSON_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      cases,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(allAppStatesFileName())}`,
      },
    });
  } catch (error) {
    console.error('[GET /api/app-state/export-all]', error);
    return NextResponse.json({ error: 'JSON一括書き出しに失敗しました' }, { status: 500 });
  }
}
