import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error-handler';
import { updateCaseSchema, caseIdParamSchema } from '@/types/validation';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/cases/[id] - Single case
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = caseIdParamSchema.parse(await params);
    const caseItem = await prisma.inheritanceCase.findUnique({ where: { id } });

    if (!caseItem) {
      return NextResponse.json({ error: '案件が見つかりません', code: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json(caseItem);
  } catch (e) {
    return handleApiError(e);
  }
}

// PUT /api/cases/[id] - Update case
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = caseIdParamSchema.parse(await params);
    const body = await request.json();
    const data = updateCaseSchema.parse(body);

    const updated = await prisma.inheritanceCase.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (e) {
    return handleApiError(e);
  }
}

// DELETE /api/cases/[id] - Delete case
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = caseIdParamSchema.parse(await params);

    await prisma.inheritanceCase.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (e) {
    return handleApiError(e);
  }
}
