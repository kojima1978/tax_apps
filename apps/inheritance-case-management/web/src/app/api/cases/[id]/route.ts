import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/api-error-handler';
import { updateCaseSchema, caseIdParamSchema } from '@/types/validation';
import { getCase, updateCase, deleteCase, isOptimisticLockError } from '@/lib/services/case-service';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = caseIdParamSchema.parse(await params);
    const caseItem = await getCase(id);

    if (!caseItem) {
      return NextResponse.json({ error: '案件が見つかりません', code: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json(caseItem);
  } catch (e) {
    return handleApiError(e);
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = caseIdParamSchema.parse(await params);
    const body = await request.json();
    const data = updateCaseSchema.parse(body);
    const updated = await updateCase(id, data);

    return NextResponse.json(updated);
  } catch (e) {
    if (isOptimisticLockError(e)) {
      if (e.code === 'NOT_FOUND') {
        return NextResponse.json({ error: '案件が見つかりません', code: 'NOT_FOUND' }, { status: 404 });
      }
      return NextResponse.json(
        { error: '他のユーザーが先に更新しました。画面を再読み込みしてください。', code: 'CONFLICT' },
        { status: 409 }
      );
    }
    return handleApiError(e);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = caseIdParamSchema.parse(await params);
    await deleteCase(id);

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return handleApiError(e);
  }
}
