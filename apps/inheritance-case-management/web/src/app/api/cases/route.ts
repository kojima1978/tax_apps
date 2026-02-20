import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/api-error-handler';
import { createCaseSchema, listQuerySchema } from '@/types/validation';

// GET /api/cases - List cases with pagination, filtering, and sorting
export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { page, pageSize, status, acceptanceStatus, fiscalYear, search, sortBy, sortOrder } =
      listQuerySchema.parse(searchParams);

    // Build where clause for filtering
    const where: Prisma.InheritanceCaseWhereInput = {};

    if (status) {
      where.status = status;
    }
    if (acceptanceStatus) {
      where.acceptanceStatus = acceptanceStatus;
    }
    if (fiscalYear) {
      where.fiscalYear = fiscalYear;
    }
    if (search) {
      where.deceasedName = { contains: search, mode: 'insensitive' };
    }

    // ページネーション用のカウントとデータ取得を並列実行
    const [total, cases] = await Promise.all([
      prisma.inheritanceCase.count({ where }),
      prisma.inheritanceCase.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      data: cases,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (e) {
    return handleApiError(e);
  }
}

// POST /api/cases - Create case
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = createCaseSchema.parse(body);

    const newCase = await prisma.inheritanceCase.create({
      data: {
        deceasedName: data.deceasedName,
        dateOfDeath: data.dateOfDeath,
        fiscalYear: data.fiscalYear,
        status: data.status ?? '未着手',
        acceptanceStatus: data.acceptanceStatus ?? '未判定',
        taxAmount: data.taxAmount ?? 0,
        assignee: data.assignee,
        feeAmount: data.feeAmount ?? 0,
        referrer: data.referrer,
        estimateAmount: data.estimateAmount ?? 0,
        propertyValue: data.propertyValue ?? 0,
        referralFeeRate: data.referralFeeRate,
        referralFeeAmount: data.referralFeeAmount,
        contacts: data.contacts ?? [],
        progress: data.progress ?? [],
      },
    });

    return NextResponse.json(newCase, { status: 201 });
  } catch (e) {
    return handleApiError(e);
  }
}
