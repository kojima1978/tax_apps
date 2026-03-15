import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error-handler';
import { updateCaseSchema, caseIdParamSchema } from '@/types/validation';
import { CASE_INCLUDE, toContactCreateData, toProgressCreateData } from '@/lib/prisma-includes';

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

    const updated = await prisma.$transaction(async (tx) => {
      // Delete + recreate contacts if provided
      if (data.contacts !== undefined) {
        await tx.caseContact.deleteMany({ where: { caseId: id } });
      }
      // Delete + recreate progress if provided
      if (data.progress !== undefined) {
        await tx.caseProgress.deleteMany({ where: { caseId: id } });
      }

      // Build update data for scalar fields
      const updateData: Record<string, unknown> = {};

      // Scalar fields
      const scalarFields = [
        'deceasedName', 'dateOfDeath', 'fiscalYear', 'status', 'acceptanceStatus',
        'taxAmount', 'feeAmount', 'estimateAmount', 'propertyValue',
        'referralFeeRate', 'referralFeeAmount', 'summary', 'memo',
      ] as const;

      for (const field of scalarFields) {
        if (field in data) {
          updateData[field] = data[field as keyof typeof data];
        }
      }

      // FK fields
      if ('assigneeId' in data) {
        updateData.assigneeId = data.assigneeId || null;
      }
      if ('referrerId' in data) {
        updateData.referrerId = data.referrerId || null;
      }

      // Nested creates for contacts/progress
      if (data.contacts) {
        updateData.contacts = { create: toContactCreateData(data.contacts) };
      }
      if (data.progress) {
        updateData.progress = { create: toProgressCreateData(data.progress) };
      }

      return tx.inheritanceCase.update({
        where: { id },
        data: updateData,
        include: CASE_INCLUDE,
      });
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
