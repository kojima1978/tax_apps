import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error-handler';
import { updateCaseSchema, caseIdParamSchema } from '@/types/validation';
import { CASE_INCLUDE, toContactCreateData, toProgressCreateData, toDate, serializeCase } from '@/lib/prisma-includes';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/cases/[id] - Single case
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = caseIdParamSchema.parse(await params);
    const caseItem = await prisma.inheritanceCase.findUnique({
      where: { id },
      include: CASE_INCLUDE,
    });

    if (!caseItem) {
      return NextResponse.json({ error: '案件が見つかりません', code: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json(serializeCase(caseItem));
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

    const updated = await prisma.$transaction(async (tx) => {
      // 楽観ロック: updatedAt が送られた場合、DB の値と比較
      if (data.updatedAt) {
        const current = await tx.inheritanceCase.findUnique({
          where: { id },
          select: { updatedAt: true },
        });
        if (!current) {
          throw { _optimisticLock: true, code: 'NOT_FOUND' };
        }
        if (current.updatedAt.toISOString() !== data.updatedAt) {
          throw { _optimisticLock: true, code: 'CONFLICT' };
        }
      }

      // Build update data for scalar fields
      const updateData: Record<string, unknown> = {};

      // Scalar fields
      const scalarFields = [
        'deceasedName', 'dateOfDeath', 'fiscalYear', 'status', 'handlingStatus', 'acceptanceStatus',
        'taxAmount', 'feeAmount', 'estimateAmount', 'propertyValue',
        'referralFeeRate', 'referralFeeAmount', 'summary', 'memo',
      ] as const;

      for (const field of scalarFields) {
        if (field in data) {
          if (field === 'dateOfDeath') {
            updateData[field] = toDate(data[field] as string);
          } else {
            updateData[field] = data[field as keyof typeof data];
          }
        }
      }

      // FK fields
      if ('assigneeId' in data) {
        updateData.assigneeId = data.assigneeId || null;
      }
      if ('internalReferrerId' in data) {
        updateData.internalReferrerId = data.internalReferrerId || null;
      }
      if ('referrerId' in data) {
        updateData.referrerId = data.referrerId || null;
      }

      // Nested updates for contacts/progress
      if (data.contacts !== undefined) {
        updateData.contacts = {
          deleteMany: {},
          create: toContactCreateData(data.contacts),
        };
      }
      if (data.progress !== undefined) {
        updateData.progress = {
          deleteMany: {},
          create: toProgressCreateData(data.progress),
        };
      }

      return tx.inheritanceCase.update({
        where: { id },
        data: updateData,
        include: CASE_INCLUDE,
      });
    });

    return NextResponse.json(serializeCase(updated));
  } catch (e) {
    if (e && typeof e === 'object' && '_optimisticLock' in e) {
      const err = e as unknown as { code: string };
      if (err.code === 'NOT_FOUND') {
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
